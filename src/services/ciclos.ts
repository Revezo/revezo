/**
 * Serviço de Ciclos e Instâncias de Tarefas (Firebase).
 *
 * Responsabilidades:
 *  - Gravar e ler ciclos e instâncias de tarefas no Firestore.
 *  - Coordenar o re-sorteio quando tarefas são adicionadas/removidas.
 *  - Expor helpers para a UI: ciclo ativo, instâncias do usuário, etc.
 */

import {
  Timestamp,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  AtribuicaoCiclo,
  Ciclo,
  InstanciaTarefa,
  MembroParaSorteio,
  StatusCiclo,
  StatusInstancia,
} from '../types/ciclo';
import { Tarefa } from '../types/tarefa';
import {
  OpcoesSorteio,
  executarMotorRotacao,
} from './motorRotacao';

// ---------------------------------------------------------------------------
// Leitura de membros da moradia
// ---------------------------------------------------------------------------

/**
 * Busca todos os membros de uma moradia para o sorteio.
 */
export async function buscarMembrosParaSorteio(moradiaId: string): Promise<MembroParaSorteio[]> {
  const snapshot = await getDocs(collection(db, 'moradias', moradiaId, 'membros'));
  const membros: MembroParaSorteio[] = [];

  snapshot.forEach((docSnap) => {
    const dados = docSnap.data();
    // Usa apelido se disponível, senão nome do doc de usuário (fallback para uid)
    membros.push({
      uid: docSnap.id,
      nome: dados.apelido?.trim() || dados.nome?.trim() || docSnap.id,
    });
  });

  return membros;
}

// ---------------------------------------------------------------------------
// Leitura / conversão de Ciclos do Firestore
// ---------------------------------------------------------------------------

function docParaCiclo(id: string, dados: any): Ciclo {
  return {
    id,
    moradiaId: dados.moradiaId,
    mes: dados.mes,
    ano: dados.ano,
    numeroCiclo: dados.numeroCiclo,
    inicioCiclo: dados.inicioCiclo?.toDate?.() ?? new Date(),
    fimCiclo: dados.fimCiclo?.toDate?.() ?? new Date(),
    geradoEm: dados.geradoEm?.toDate?.() ?? new Date(),
    status: dados.status ?? 'futuro',
  };
}

function docParaInstancia(id: string, dados: any): InstanciaTarefa {
  return {
    id,
    cicloId: dados.cicloId,
    numeroCiclo: dados.numeroCiclo ?? 0,
    tarefaId: dados.tarefaId,
    tarefaNome: dados.tarefaNome,
    tarefaPeso: dados.tarefaPeso ?? 1,
    moradiaId: dados.moradiaId,
    usuarioId: dados.usuarioId,
    usuarioNome: dados.usuarioNome,
    status: dados.status ?? 'pendente',
    fotos: dados.fotos ?? [],
    atribuidaEm: dados.atribuidaEm?.toDate?.() ?? new Date(),
    concluidaEm: dados.concluidaEm?.toDate?.() ?? null,
    prazoFim: dados.prazoFim?.toDate?.() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Verificação de ciclo publicado
// ---------------------------------------------------------------------------

/**
 * Verifica se o ciclo 1 do mês/ano já foi publicado no Firestore.
 * Retorna o índice (0-based) do primeiro ciclo ainda não publicado.
 * Retorna 0 se nenhum ciclo foi publicado ainda.
 */
export async function indicePrimeiroCicloNaoPublicado(
  moradiaId: string,
  ano: number,
  mes: number,
): Promise<number> {
  const q = query(
    collection(db, 'ciclos'),
    where('moradiaId', '==', moradiaId),
    where('ano', '==', ano),
    where('mes', '==', mes),
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return 0;

  // O maior numeroCiclo já publicado indica quantos já foram
  const numerosPublicados = snapshot.docs.map((d) => d.data().numeroCiclo as number);
  const maiorPublicado = Math.max(...numerosPublicados);

  // Retorna o índice (0-based) do próximo não publicado
  return Math.min(maiorPublicado, 3); // máximo 3 (índice do ciclo 4)
}

// ---------------------------------------------------------------------------
// Persistência: gravar resultado do motor no Firestore
// ---------------------------------------------------------------------------

/**
 * Grava os ciclos e instâncias no Firestore usando um batch write.
 * Ciclos com atribuicoes vazias (já publicados) são ignorados.
 */
export async function gravarResultadoMotor(
  moradiaId: string,
  ciclos: AtribuicaoCiclo[],
  mes: number,
  ano: number,
  cicloPularAte: number = 0,
): Promise<void> {
  const batch = writeBatch(db);
  const agora = new Date();

  for (const ciclo of ciclos) {
    // Pula ciclos que já foram publicados (index < cicloPularAte)
    if (ciclo.numeroCiclo - 1 < cicloPularAte) continue;
    if (ciclo.atribuicoes.length === 0) continue;

    // Determina status do ciclo
    const status: StatusCiclo =
      agora >= ciclo.inicioCiclo && agora <= ciclo.fimCiclo
        ? 'ativo'
        : agora < ciclo.inicioCiclo
          ? 'futuro'
          : 'encerrado';

    // Cria documento do ciclo
    const cicloRef = doc(collection(db, 'ciclos'));
    batch.set(cicloRef, {
      moradiaId,
      mes,
      ano,
      numeroCiclo: ciclo.numeroCiclo,
      inicioCiclo: Timestamp.fromDate(ciclo.inicioCiclo),
      fimCiclo: Timestamp.fromDate(ciclo.fimCiclo),
      geradoEm: serverTimestamp(),
      status,
    });

    // Cria instâncias de tarefa para este ciclo
    for (const atribuicao of ciclo.atribuicoes) {
      const instanciaRef = doc(collection(db, 'instancias_tarefa'));
      batch.set(instanciaRef, {
        cicloId: cicloRef.id,
        numeroCiclo: ciclo.numeroCiclo,
        tarefaId: atribuicao.tarefaId,
        tarefaNome: atribuicao.tarefaNome,
        tarefaPeso: atribuicao.tarefaPeso,
        moradiaId,
        usuarioId: atribuicao.usuarioId,
        usuarioNome: atribuicao.usuarioNome,
        status: 'pendente' as StatusInstancia,
        fotos: [],
        atribuidaEm: serverTimestamp(),
        concluidaEm: null,
        prazoFim: atribuicao.prazoFim ? Timestamp.fromDate(atribuicao.prazoFim) : null,
      });
    }
  }

  await batch.commit();
}

// ---------------------------------------------------------------------------
// Ponto de entrada principal: rodar (ou re-rodar) o motor
// ---------------------------------------------------------------------------

/**
 * Executa o motor de rotação e persiste o resultado no Firestore.
 *
 * Se o ciclo 1 já foi publicado (ex.: tarefa adicionada no meio do mês),
 * o sorteio é feito apenas para os ciclos restantes.
 *
 * @param moradiaId  ID da moradia.
 * @param tarefas    Lista de tarefas ativas da moradia.
 * @param opcoes     Opções adicionais (ex.: forçar re-sorteio completo).
 */
export async function rodarMotorRotacao(
  moradiaId: string,
  tarefas: Tarefa[],
  opcoes: { forcarReSorteioCompleto?: boolean } = {},
): Promise<void> {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth();

  const membros = await buscarMembrosParaSorteio(moradiaId);
  if (membros.length === 0) return; // sem moradores, nada a fazer

  // Descobre quantos ciclos já foram publicados
  const cicloPularAte = opcoes.forcarReSorteioCompleto
    ? 0
    : await indicePrimeiroCicloNaoPublicado(moradiaId, ano, mes);

  // Se todos os 4 ciclos já foram publicados, não refaz
  if (cicloPularAte >= 4) return;

  const resultado = executarMotorRotacao(tarefas, membros, ano, mes, {
    cicloPularAte,
  } as OpcoesSorteio);

  await gravarResultadoMotor(moradiaId, resultado.ciclos, mes, ano, cicloPularAte);
}

// ---------------------------------------------------------------------------
// Leitura: ciclo ativo da moradia
// ---------------------------------------------------------------------------

/**
 * Retorna o ciclo ativo do mês atual para uma moradia.
 * Retorna null se não houver ciclo ativo publicado.
 */
export async function buscarCicloAtivo(moradiaId: string): Promise<Ciclo | null> {
  const agora = new Date();
  const q = query(
    collection(db, 'ciclos'),
    where('moradiaId', '==', moradiaId),
    where('ano', '==', agora.getFullYear()),
    where('mes', '==', agora.getMonth()),
    where('status', '==', 'ativo'),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const d = snapshot.docs[0];
  return docParaCiclo(d.id, d.data());
}

/**
 * Retorna todos os ciclos do mês atual para uma moradia.
 */
export async function buscarCiclosDoMes(moradiaId: string): Promise<Ciclo[]> {
  const agora = new Date();
  const q = query(
    collection(db, 'ciclos'),
    where('moradiaId', '==', moradiaId),
    where('ano', '==', agora.getFullYear()),
    where('mes', '==', agora.getMonth()),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => docParaCiclo(d.id, d.data()))
    .sort((a, b) => a.numeroCiclo - b.numeroCiclo);
}

// ---------------------------------------------------------------------------
// Leitura: instâncias de tarefa
// ---------------------------------------------------------------------------

/**
 * Retorna todas as instâncias de tarefa de um ciclo.
 */
export async function buscarInstanciasDoCiclo(cicloId: string): Promise<InstanciaTarefa[]> {
  const q = query(collection(db, 'instancias_tarefa'), where('cicloId', '==', cicloId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => docParaInstancia(d.id, d.data()))
    .sort((a, b) => b.tarefaPeso - a.tarefaPeso);
}

/**
 * Retorna as instâncias do ciclo ativo pertencentes a um usuário específico.
 */
export async function buscarInstanciasDoCicloParaUsuario(
  moradiaId: string,
  usuarioId: string,
): Promise<InstanciaTarefa[]> {
  // Como fallback, buscamos todas do ciclo ativo e filtramos no cliente.
  const cicloAtivo = await buscarCicloAtivo(moradiaId);
  if (!cicloAtivo) return [];

  const instancias = await buscarInstanciasDoCiclo(cicloAtivo.id);
  return instancias.filter((i) => i.usuarioId === usuarioId);
}

/**
 * Retorna TODAS as instâncias do ciclo ativo (todos os moradores).
 * Útil para a tela de visão geral do admin.
 */
export async function buscarTodasInstanciasCicloAtivo(
  moradiaId: string,
): Promise<InstanciaTarefa[]> {
  const cicloAtivo = await buscarCicloAtivo(moradiaId);
  if (!cicloAtivo) return [];
  return buscarInstanciasDoCiclo(cicloAtivo.id);
}

// ---------------------------------------------------------------------------
// Atualização: marcar instância como concluída
// ---------------------------------------------------------------------------

/**
 * Marca uma instância de tarefa como concluída.
 * Pode opcionalmente adicionar URLs de fotos de comprovação.
 */
export async function concluirInstancia(
  instanciaId: string,
  fotos: string[] = [],
): Promise<void> {
  await updateDoc(doc(db, 'instancias_tarefa', instanciaId), {
    status: 'concluida' as StatusInstancia,
    concluidaEm: serverTimestamp(),
    fotos,
  });
}

// ---------------------------------------------------------------------------
// Listener em tempo real: instâncias do ciclo ativo do usuário
// ---------------------------------------------------------------------------

/**
 * Observa em tempo real as instâncias do ciclo ativo para um usuário.
 * Retorna a função de cancelamento (unsubscribe).
 */
export function observarInstanciasDoUsuario(
  moradiaId: string,
  usuarioId: string,
  onChange: (instancias: InstanciaTarefa[]) => void,
): () => void {
  const q = query(
    collection(db, 'instancias_tarefa'),
    where('moradiaId', '==', moradiaId),
    where('usuarioId', '==', usuarioId),
  );

  return onSnapshot(q, (snapshot) => {
    const agora = new Date();
    // Filtra apenas as do mês/ano corrente no cliente
    const instancias = snapshot.docs
      .map((d) => docParaInstancia(d.id, d.data()))
      .filter((i) => {
        return (
          i.atribuidaEm.getFullYear() === agora.getFullYear() &&
          i.atribuidaEm.getMonth() === agora.getMonth()
        );
      })
      .sort((a, b) => a.status.localeCompare(b.status));

    onChange(instancias);
  });
}

// ---------------------------------------------------------------------------
// Utilitário: resumo de progresso do ciclo
// ---------------------------------------------------------------------------

export interface ResumoCiclo {
  total: number;
  concluidas: number;
  pendentes: number;
  percentual: number; // 0–100
}

export function calcularResumoCiclo(instancias: InstanciaTarefa[]): ResumoCiclo {
  const total = instancias.length;
  const concluidas = instancias.filter((i) => i.status === 'concluida').length;
  const pendentes = total - concluidas;
  const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  return { total, concluidas, pendentes, percentual };
}

// ---------------------------------------------------------------------------
// Atualização de status de ciclos (cronjob-like, chamado na abertura do app)
// ---------------------------------------------------------------------------

/**
 * Verifica e atualiza o status dos ciclos do mês atual.
 * Deve ser chamado periodicamente (ex.: na abertura do app ou a cada hora).
 *
 * - Ciclos com `inicioCiclo` no passado e `fimCiclo` no futuro → 'ativo'
 * - Ciclos com `fimCiclo` no passado → 'encerrado'
 * - Demais → 'futuro'
 */
export async function atualizarStatusCiclos(moradiaId: string): Promise<void> {
  const agora = new Date();
  const q = query(
    collection(db, 'ciclos'),
    where('moradiaId', '==', moradiaId),
    where('ano', '==', agora.getFullYear()),
    where('mes', '==', agora.getMonth()),
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);

  snapshot.docs.forEach((docSnap) => {
    const dados = docSnap.data();
    const inicio: Date = dados.inicioCiclo?.toDate?.() ?? new Date(0);
    const fim: Date = dados.fimCiclo?.toDate?.() ?? new Date(0);

    let novoStatus: StatusCiclo;
    if (agora >= inicio && agora <= fim) {
      novoStatus = 'ativo';
    } else if (agora > fim) {
      novoStatus = 'encerrado';
    } else {
      novoStatus = 'futuro';
    }

    if (dados.status !== novoStatus) {
      batch.update(docSnap.ref, { status: novoStatus });
    }
  });

  await batch.commit();
}
