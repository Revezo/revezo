import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { PerfilUsuario, ehAdministrador } from './moradia';
import {
  DadosNovaTarefa,
  Tarefa,
  proximoSorteioElegivel,
  validarDadosTarefa,
} from '../types/tarefa';

export class PermissaoNegadaError extends Error {
  constructor(mensagem = 'Apenas administradores da moradia podem gerenciar tarefas.') {
    super(mensagem);
    this.name = 'PermissaoNegadaError';
  }
}

export class DadosInvalidosError extends Error {
  erros: string[];
  constructor(erros: string[]) {
    super(erros.join('\n'));
    this.name = 'DadosInvalidosError';
    this.erros = erros;
  }
}

/** Dados de saída do RF4. */
export interface ConfirmacaoCadastro {
  id: string;
  nome: string;
  proximoSorteio: Date;
}

export async function cadastrarTarefa(
  perfil: PerfilUsuario | null,
  dados: DadosNovaTarefa,
): Promise<ConfirmacaoCadastro> {
  if (!perfil) throw new PermissaoNegadaError('Faça login para cadastrar tarefas.');
  if (!ehAdministrador(perfil)) throw new PermissaoNegadaError();

  const erros = validarDadosTarefa(dados);
  if (erros.length > 0) throw new DadosInvalidosError(erros);

  const sorteio = proximoSorteioElegivel(dados.janelaAntecedenciaHoras);

  const referencia = await addDoc(collection(db, 'tarefas'), {
    moradiaId: perfil.moradiaId,
    nome: dados.nome.trim(),
    frequencia: dados.frequencia,
    pesoDificuldade: dados.pesoDificuldade,
    prazoConclusaoDias: dados.prazoConclusaoDias,
    janelaAntecedenciaHoras: dados.janelaAntecedenciaHoras,
    ativa: true,
    disponivelParaSorteio: true,
    proximoSorteioElegivel: Timestamp.fromDate(sorteio),
    criadaPor: perfil.uid,
    criadaEm: serverTimestamp(),
  });

  return { id: referencia.id, nome: dados.nome.trim(), proximoSorteio: sorteio };
}

export async function listarTarefas(moradiaId: string): Promise<Tarefa[]> {
  const consulta = query(collection(db, 'tarefas'), where('moradiaId', '==', moradiaId));
  const snapshot = await getDocs(consulta);

  return snapshot.docs
    .map((documento) => {
      const dados = documento.data() as any;
      return {
        id: documento.id,
        moradiaId: dados.moradiaId,
        nome: dados.nome,
        frequencia: dados.frequencia,
        pesoDificuldade: dados.pesoDificuldade ?? 1,
        prazoConclusaoDias: dados.prazoConclusaoDias ?? null,
        janelaAntecedenciaHoras: dados.janelaAntecedenciaHoras ?? null,
        ativa: dados.ativa ?? true,
        disponivelParaSorteio: dados.disponivelParaSorteio ?? true,
        proximoSorteioElegivel: dados.proximoSorteioElegivel?.toDate?.() ?? null,
        criadaPor: dados.criadaPor ?? '',
        criadaEm: dados.criadaEm?.toDate?.() ?? null,
      } as Tarefa;
    })
    // Ordenação no cliente para não exigir índice composto no Firestore.
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function excluirTarefa(perfil: PerfilUsuario | null, id: string): Promise<void> {
  if (!ehAdministrador(perfil)) throw new PermissaoNegadaError();
  await deleteDoc(doc(db, 'tarefas', id));
}
