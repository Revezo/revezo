/**
 * Serviço de Trocas de Tarefas (Firebase).
 *
 * Responsabilidades:
 *  - Listar tarefas pendentes do ciclo atual (próprias e de outros moradores, sem expor identidades).
 *  - Criar propostas de troca cega (`trocas`).
 *  - Listar propostas recebidas e enviadas do usuário logado.
 *  - Aceitar (realocando ambas as instâncias atomicamente) ou recusar propostas.
 */

import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { InstanciaTarefa } from '../types/ciclo';
import { PropostaTroca, StatusTroca } from '../types/troca';
import {
  atualizarStatusCiclos,
  buscarCicloAtivo,
  buscarCiclosDoMes,
  buscarInstanciasDoCiclo,
} from './ciclos';

function parseDataOpcional(valor: any): Date | null {
  if (!valor) return null;
  if (typeof valor.toDate === 'function') return valor.toDate();
  if (valor instanceof Date) return valor;
  if (typeof valor.seconds === 'number') return new Date(valor.seconds * 1000);
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

function docParaTroca(id: string, dados: any): PropostaTroca {
  return {
    id,
    moradiaId: dados.moradiaId,
    cicloId: dados.cicloId,
    proponenteId: dados.proponenteId,
    proponenteNome: dados.proponenteNome ?? 'Morador',
    destinatarioId: dados.destinatarioId,
    destinatarioNome: dados.destinatarioNome ?? 'Morador',
    instanciaOrigemId: dados.instanciaOrigemId,
    tarefaOrigemNome: dados.tarefaOrigemNome ?? 'Tarefa',
    tarefaOrigemPeso: Number(dados.tarefaOrigemPeso ?? 1),
    tarefaOrigemDescricao: dados.tarefaOrigemDescricao ?? undefined,
    tarefaOrigemPrazo: parseDataOpcional(dados.tarefaOrigemPrazo),
    instanciaSolicitadaId: dados.instanciaSolicitadaId,
    tarefaSolicitadaNome: dados.tarefaSolicitadaNome ?? 'Tarefa',
    tarefaSolicitadaPeso: Number(dados.tarefaSolicitadaPeso ?? 1),
    tarefaSolicitadaDescricao: dados.tarefaSolicitadaDescricao ?? undefined,
    tarefaSolicitadaPrazo: parseDataOpcional(dados.tarefaSolicitadaPrazo),
    status: (dados.status ?? 'pendente') as StatusTroca,
    motivoRecusa: dados.motivoRecusa ?? undefined,
    cicloFim: parseDataOpcional(dados.cicloFim),
    criadaEm: parseDataOpcional(dados.criadaEm) ?? new Date(),
    respondidaEm: parseDataOpcional(dados.respondidaEm),
  };
}

export interface TarefasElegiveisTroca {
  cicloId: string;
  cicloFim: Date | null;
  minhasPendentes: InstanciaTarefa[];
  outrasPendentes: InstanciaTarefa[];
}

/**
 * Busca o ciclo ativo atual e separa as tarefas pendentes do usuário
 * das tarefas pendentes dos demais moradores.
 */
export async function buscarTarefasElegiveisParaTroca(
  moradiaId: string,
  uidUsuario: string,
): Promise<TarefasElegiveisTroca | null> {
  await atualizarStatusCiclos(moradiaId);

  let ciclo = await buscarCicloAtivo(moradiaId);
  if (!ciclo) {
    const ciclosMes = await buscarCiclosDoMes(moradiaId);
    ciclo = ciclosMes.find((c) => c.status !== 'encerrado') ?? ciclosMes[0] ?? null;
  }
  if (!ciclo) return null;

  const todas = await buscarInstanciasDoCiclo(ciclo.id);
  const pendentes = todas.filter((i) => i.status === 'pendente');

  return {
    cicloId: ciclo.id,
    cicloFim: ciclo.fimCiclo,
    minhasPendentes: pendentes.filter((i) => i.usuarioId === uidUsuario),
    outrasPendentes: pendentes.filter((i) => i.usuarioId !== uidUsuario),
  };
}

/**
 * Lista propostas recebidas e enviadas do usuário na moradia.
 */
export async function listarTrocasDoUsuario(
  moradiaId: string,
  uidUsuario: string,
): Promise<{ recebidas: PropostaTroca[]; enviadas: PropostaTroca[] }> {
  const [snapRecebidas, snapEnviadas] = await Promise.all([
    getDocs(
      query(
        collection(db, 'trocas'),
        where('moradiaId', '==', moradiaId),
        where('destinatarioId', '==', uidUsuario),
      ),
    ),
    getDocs(
      query(
        collection(db, 'trocas'),
        where('moradiaId', '==', moradiaId),
        where('proponenteId', '==', uidUsuario),
      ),
    ),
  ]);

  const recebidas = snapRecebidas.docs
    .map((d) => docParaTroca(d.id, d.data()))
    .filter((t) => t.status === 'pendente')
    .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime());

  const enviadas = snapEnviadas.docs
    .map((d) => docParaTroca(d.id, d.data()))
    .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime());

  return { recebidas, enviadas };
}

export async function buscarTrocaPorId(trocaId: string): Promise<PropostaTroca | null> {
  const snap = await getDoc(doc(db, 'trocas', trocaId));
  if (!snap.exists()) return null;
  return docParaTroca(snap.id, snap.data());
}

/**
 * Cria uma nova proposta de troca entre duas tarefas pendentes do ciclo atual.
 */
export async function criarPropostaTroca(params: {
  moradiaId: string;
  cicloId: string;
  cicloFim: Date | null;
  proponenteId: string;
  proponenteNome: string;
  instanciaOrigem: InstanciaTarefa;
  instanciaSolicitada: InstanciaTarefa;
}): Promise<string> {
  const {
    moradiaId,
    cicloId,
    cicloFim,
    proponenteId,
    proponenteNome,
    instanciaOrigem,
    instanciaSolicitada,
  } = params;

  if (instanciaOrigem.usuarioId !== proponenteId) {
    throw new Error('A tarefa oferecida precisa estar atribuída a você.');
  }
  if (instanciaSolicitada.usuarioId === proponenteId) {
    throw new Error('Escolha uma tarefa atribuída a outro morador.');
  }
  if (instanciaOrigem.status !== 'pendente' || instanciaSolicitada.status !== 'pendente') {
    throw new Error('Ambas as tarefas precisam estar pendentes no ciclo atual.');
  }

  // Evita proposta duplicada idêntica ainda pendente
  const existentesSnap = await getDocs(
    query(
      collection(db, 'trocas'),
      where('moradiaId', '==', moradiaId),
      where('proponenteId', '==', proponenteId),
      where('status', '==', 'pendente'),
    ),
  );
  const duplicada = existentesSnap.docs.some((d) => {
    const data = d.data();
    return (
      data.instanciaOrigemId === instanciaOrigem.id &&
      data.instanciaSolicitadaId === instanciaSolicitada.id
    );
  });
  if (duplicada) {
    throw new Error('Você já enviou uma proposta pendente exatamente para essas tarefas.');
  }

  const ref = await addDoc(collection(db, 'trocas'), {
    moradiaId,
    cicloId,
    proponenteId,
    proponenteNome,
    destinatarioId: instanciaSolicitada.usuarioId,
    destinatarioNome: instanciaSolicitada.usuarioNome,
    instanciaOrigemId: instanciaOrigem.id,
    tarefaOrigemNome: instanciaOrigem.tarefaNome,
    tarefaOrigemPeso: instanciaOrigem.tarefaPeso,
    tarefaOrigemDescricao: instanciaOrigem.descricao ?? null,
    tarefaOrigemPrazo: instanciaOrigem.prazoFim
      ? Timestamp.fromDate(instanciaOrigem.prazoFim)
      : null,
    instanciaSolicitadaId: instanciaSolicitada.id,
    tarefaSolicitadaNome: instanciaSolicitada.tarefaNome,
    tarefaSolicitadaPeso: instanciaSolicitada.tarefaPeso,
    tarefaSolicitadaDescricao: instanciaSolicitada.descricao ?? null,
    tarefaSolicitadaPrazo: instanciaSolicitada.prazoFim
      ? Timestamp.fromDate(instanciaSolicitada.prazoFim)
      : null,
    status: 'pendente' as StatusTroca,
    cicloFim: cicloFim ? Timestamp.fromDate(cicloFim) : null,
    criadaEm: serverTimestamp(),
    respondidaEm: null,
  });

  return ref.id;
}

/**
 * Aceita uma proposta pendente e realoca automaticamente os responsáveis
 * pelas duas instâncias de tarefa no ciclo atual.
 */
export async function aceitarTroca(trocaId: string, uidDestinatario: string): Promise<void> {
  const trocaRef = doc(db, 'trocas', trocaId);

  await runTransaction(db, async (transaction) => {
    const trocaSnap = await transaction.get(trocaRef);
    if (!trocaSnap.exists()) {
      throw new Error('Proposta de troca não encontrada.');
    }

    const troca = trocaSnap.data();
    if (troca.destinatarioId !== uidDestinatario) {
      throw new Error('Você não tem permissão para aceitar esta proposta.');
    }
    if (troca.status !== 'pendente') {
      throw new Error('Esta proposta já foi respondida.');
    }

    const origemRef = doc(db, 'instancias_tarefa', troca.instanciaOrigemId);
    const solicitadaRef = doc(db, 'instancias_tarefa', troca.instanciaSolicitadaId);

    const [origemSnap, solicitadaSnap] = await Promise.all([
      transaction.get(origemRef),
      transaction.get(solicitadaRef),
    ]);

    if (!origemSnap.exists() || !solicitadaSnap.exists()) {
      throw new Error('Uma das tarefas desta troca não foi encontrada.');
    }

    const origem = origemSnap.data();
    const solicitada = solicitadaSnap.data();

    if (origem.status !== 'pendente' || solicitada.status !== 'pendente') {
      throw new Error('Não é possível concluir a troca porque uma das tarefas já foi finalizada.');
    }
    if (origem.usuarioId !== troca.proponenteId || solicitada.usuarioId !== troca.destinatarioId) {
      throw new Error('Os responsáveis pelas tarefas mudaram desde o envio da proposta.');
    }

    // Realoca as duas tarefas entre os moradores
    transaction.update(origemRef, {
      usuarioId: troca.destinatarioId,
      usuarioNome: troca.destinatarioNome,
      ultimaTrocaId: trocaId,
    });
    transaction.update(solicitadaRef, {
      usuarioId: troca.proponenteId,
      usuarioNome: troca.proponenteNome,
    });
    transaction.update(trocaRef, {
      status: 'aceita' as StatusTroca,
      respondidaEm: serverTimestamp(),
    });
  });
}

/**
 * Recusa uma proposta de troca pendente com motivo neutro opcional.
 */
export async function recusarTroca(
  trocaId: string,
  uidDestinatario: string,
  motivo?: string,
): Promise<void> {
  const trocaRef = doc(db, 'trocas', trocaId);
  const snap = await getDoc(trocaRef);
  if (!snap.exists()) {
    throw new Error('Proposta de troca não encontrada.');
  }
  const dados = snap.data();
  if (dados.destinatarioId !== uidDestinatario) {
    throw new Error('Você não tem permissão para recusar esta proposta.');
  }
  if (dados.status !== 'pendente') {
    throw new Error('Esta proposta já foi respondida.');
  }

  await updateDoc(trocaRef, {
    status: 'recusada' as StatusTroca,
    motivoRecusa: motivo?.trim() || null,
    respondidaEm: serverTimestamp(),
  });
}
