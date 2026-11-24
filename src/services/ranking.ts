/**
 * Serviço de Gamificação e Ranking (Firebase).
 *
 * Responsabilidades:
 *  - Buscar os moradores da moradia e seus pontos acumulados (`usuarios/{uid}.pontosAcumulados`).
 *  - Calcular colocação no pódio, progresso, cumprimento e sequência de ciclos (streak).
 */

import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ciclo, InstanciaTarefa } from '../types/ciclo';
import { docParaInstancia } from './ciclos';

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export interface MoradorRanking {
  uid: string;
  nome: string;
  fotoUrl?: string;
  pontos: number;
  posicao: number;
  concluidas: number;
  totalTarefas: number;
  cumprimentoPercent: number;
  progressoCicloAtualPercent: number;
  streak: number;
  melhorPosicao: number;
}

export interface DadosRanking {
  moradores: MoradorRanking[];
  usuarioAtual: MoradorRanking | null;
  maxPontos: number;
  rotuloCicloAtual: string;
}

function parseData(valor: any): Date {
  if (!valor) return new Date();
  if (typeof valor.toDate === 'function') return valor.toDate();
  if (valor instanceof Date) return valor;
  if (typeof valor.seconds === 'number') return new Date(valor.seconds * 1000);
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function calcularStreakCiclos(
  ciclos: Ciclo[],
  instancias: InstanciaTarefa[],
  uid: string,
): number {
  const ciclosRelevantes = ciclos
    .filter((c) => c.status === 'encerrado' || c.status === 'ativo')
    .sort((a, b) => b.fimCiclo.getTime() - a.fimCiclo.getTime());

  let streak = 0;

  for (const ciclo of ciclosRelevantes) {
    const doMorador = instancias.filter((i) => i.cicloId === ciclo.id && i.usuarioId === uid);
    if (doMorador.length === 0) continue;

    const todasConcluidas = doMorador.every((i) => i.status === 'concluida');
    if (todasConcluidas) {
      streak += 1;
    } else if (ciclo.status === 'ativo') {
      // Ciclo ativo em andamento ainda pode ser concluído sem quebrar a sequência anterior
      continue;
    } else {
      break;
    }
  }

  return streak;
}

function formatarRotuloCicloAtual(cicloAtivo: Ciclo | null): string {
  const agora = new Date();
  const indiceMes = cicloAtivo ? cicloAtivo.mes : agora.getMonth();
  const mes = MESES_ABREV[indiceMes] ?? MESES_ABREV[agora.getMonth()];
  const ano = cicloAtivo ? cicloAtivo.ano : agora.getFullYear();
  return `Ciclo atual • ${mes} ${ano}`;
}

export async function carregarRankingMoradia(
  moradiaId: string,
  uidAtual?: string,
): Promise<DadosRanking> {
  const [membrosSnap, ciclosSnap, instanciasSnap] = await Promise.all([
    getDocs(collection(db, 'moradias', moradiaId, 'membros')),
    getDocs(query(collection(db, 'ciclos'), where('moradiaId', '==', moradiaId))),
    getDocs(query(collection(db, 'instancias_tarefa'), where('moradiaId', '==', moradiaId))),
  ]);

  const ciclos: Ciclo[] = ciclosSnap.docs.map((d) => {
    const dados = d.data();
    return {
      id: d.id,
      moradiaId: dados.moradiaId,
      mes: dados.mes,
      ano: dados.ano,
      numeroCiclo: dados.numeroCiclo,
      inicioCiclo: parseData(dados.inicioCiclo),
      fimCiclo: parseData(dados.fimCiclo),
      geradoEm: parseData(dados.geradoEm),
      status: dados.status ?? 'futuro',
    };
  });

  const instancias: InstanciaTarefa[] = instanciasSnap.docs.map((d) =>
    docParaInstancia(d.id, d.data()),
  );

  const agora = new Date();
  const cicloAtivo =
    ciclos.find(
      (c) =>
        c.status === 'ativo' &&
        c.mes === agora.getMonth() &&
        c.ano === agora.getFullYear(),
    ) ??
    ciclos.find((c) => c.status === 'ativo') ??
    null;

  const baseMoradores = await Promise.all(
    membrosSnap.docs.map(async (membroDoc) => {
      const uid = membroDoc.id;
      const membroDados = membroDoc.data();

      let usuarioDados: Record<string, any> | null = null;
      try {
        const userSnap = await getDoc(doc(db, 'usuarios', uid));
        if (userSnap.exists()) {
          usuarioDados = userSnap.data();
        }
      } catch {
        usuarioDados = null;
      }

      const apelido = typeof membroDados.apelido === 'string' ? membroDados.apelido.trim() : '';
      const nomeUser = typeof usuarioDados?.nome === 'string' ? usuarioDados.nome.trim() : '';
      const emailPrefix =
        typeof membroDados.email === 'string' ? membroDados.email.split('@')[0] : '';
      const nome = apelido || nomeUser || emailPrefix || 'Morador';

      const fotoUrl =
        usuarioDados?.fotoUrl ||
        usuarioDados?.photoURL ||
        usuarioDados?.foto ||
        membroDados.fotoUrl ||
        undefined;

      const pontos = Math.max(0, Number(usuarioDados?.pontosAcumulados ?? 0));
      const melhorSalva = Number(usuarioDados?.melhorPosicao ?? 0);

      const minhasInstancias = instancias.filter((i) => i.usuarioId === uid);
      const totalTarefas = minhasInstancias.length;
      const concluidas = minhasInstancias.filter((i) => i.status === 'concluida').length;
      const cumprimentoPercent = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;

      const doCicloAtivo = cicloAtivo
        ? minhasInstancias.filter((i) => i.cicloId === cicloAtivo.id)
        : [];
      const concluidasCiclo = doCicloAtivo.filter((i) => i.status === 'concluida').length;
      const progressoCicloAtualPercent =
        doCicloAtivo.length > 0
          ? Math.round((concluidasCiclo / doCicloAtivo.length) * 100)
          : cumprimentoPercent;

      const streak = calcularStreakCiclos(ciclos, instancias, uid);

      return {
        uid,
        nome,
        fotoUrl: typeof fotoUrl === 'string' && fotoUrl.length > 0 ? fotoUrl : undefined,
        pontos,
        concluidas,
        totalTarefas,
        cumprimentoPercent,
        progressoCicloAtualPercent,
        streak,
        melhorSalva,
      };
    }),
  );

  baseMoradores.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.cumprimentoPercent !== a.cumprimentoPercent) {
      return b.cumprimentoPercent - a.cumprimentoPercent;
    }
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  const moradores: MoradorRanking[] = baseMoradores.map((item) => {
    const posicao = 1 + baseMoradores.filter((outro) => outro.pontos > item.pontos).length;
    const melhorPosicao =
      item.melhorSalva > 0 ? Math.min(item.melhorSalva, posicao) : posicao;
    return {
      uid: item.uid,
      nome: item.nome,
      fotoUrl: item.fotoUrl,
      pontos: item.pontos,
      posicao,
      concluidas: item.concluidas,
      totalTarefas: item.totalTarefas,
      cumprimentoPercent: item.cumprimentoPercent,
      progressoCicloAtualPercent: item.progressoCicloAtualPercent,
      streak: item.streak,
      melhorPosicao,
    };
  });

  const usuarioAtual = uidAtual ? moradores.find((m) => m.uid === uidAtual) ?? null : null;

  if (uidAtual && usuarioAtual && usuarioAtual.pontos > 0) {
    const salvo = baseMoradores.find((m) => m.uid === uidAtual)?.melhorSalva ?? 0;
    if (salvo === 0 || usuarioAtual.posicao < salvo) {
      setDoc(
        doc(db, 'usuarios', uidAtual),
        { melhorPosicao: usuarioAtual.posicao },
        { merge: true },
      ).catch(() => {});
    }
  }

  const maxPontos = moradores.reduce((acc, m) => Math.max(acc, m.pontos), 0);

  return {
    moradores,
    usuarioAtual,
    maxPontos,
    rotuloCicloAtual: formatarRotuloCicloAtual(cicloAtivo),
  };
}
