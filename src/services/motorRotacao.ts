/**
 * Motor de Rotação de Tarefas — lógica pura (sem Firebase).
 *
 * Responsabilidades:
 *  1. Calcular os 4 intervalos de ciclo do mês.
 *  2. Expandir cada tarefa em N instâncias (conforme frequência).
 *  3. Distribuir instâncias nos ciclos.
 *  4. Atribuir tarefas aos moradores equilibrando a carga por peso (greedy).
 *
 * Este módulo é 100% puro — não faz chamadas de rede nem acessa Firebase —
 * para facilitar testes unitários independentes.
 */

import { Tarefa } from '../types/tarefa';
import { AtribuicaoCiclo, MembroParaSorteio, ResultadoMotor } from '../types/ciclo';

// ---------------------------------------------------------------------------
// Auxiliares de data
// ---------------------------------------------------------------------------

/** Retorna os 4 intervalos [inicio, fim] das semanas do mês. */
export function calcularCiclosDoMes(ano: number, mes: number): Array<{ inicio: Date; fim: Date }> {
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  // Dividimos o mês em 4 fatias o mais uniformes possível.
  // Fatia base = floor(totalDias / 4); os dias restantes são distribuídos nas primeiras fatias.
  const baseDias = Math.floor(totalDias / 4);
  const extras = totalDias % 4; // 0, 1, 2 ou 3

  const ciclos: Array<{ inicio: Date; fim: Date }> = [];
  let diaAtual = 1;

  for (let i = 0; i < 4; i++) {
    const duracao = baseDias + (i < extras ? 1 : 0);
    const inicio = new Date(ano, mes, diaAtual, 0, 0, 0, 0);
    const fim = new Date(ano, mes, diaAtual + duracao - 1, 23, 59, 59, 999);
    ciclos.push({ inicio, fim });
    diaAtual += duracao;
  }

  return ciclos;
}

// ---------------------------------------------------------------------------
// Expansão de frequências
// ---------------------------------------------------------------------------

/**
 * Dado uma tarefa, retorna quantas instâncias ela gera em cada ciclo.
 * Index 0 = ciclo 1, index 3 = ciclo 4.
 */
function instanciasPorCiclo(tarefa: Tarefa): number[] {
  switch (tarefa.frequencia.tipo) {
    case 'mensal':
      // Uma única instância no ciclo 1 (ou distribuída aleatoriamente)
      return [1, 0, 0, 0];

    case 'semanal': {
      // Uma instância por semana (ciclo) independente de quantos dias específicos foram escolhidos.
      // O objetivo é que a tarefa apareça uma vez por ciclo.
      return [1, 1, 1, 1];
    }

    case 'diaria': {
      // Vezes por dia × 7 dias ÷ 4 ciclos ≈ vezesPorDia * 1.75 por ciclo.
      // Simplificado: vezesPorDia instâncias por ciclo (mínimo 1 por ciclo).
      const v = tarefa.frequencia.parametros.vezesPorDia;
      return [v, v, v, v];
    }

    default:
      return [0, 0, 0, 0];
  }
}

// ---------------------------------------------------------------------------
// Algoritmo de distribuição greedy por peso
// ---------------------------------------------------------------------------

interface CargaMorador {
  uid: string;
  nome: string;
  cargaTotal: number;
}

/**
 * Dado um array de tarefas para um ciclo e uma lista de moradores,
 * retorna as atribuições equilibradas por peso (greedy: menor carga primeiro).
 */
function distribuirEntreMoradores(
  tarefas: Array<{ tarefaId: string; tarefaNome: string; tarefaPeso: number; prazoFim: Date | null }>,
  membros: MembroParaSorteio[],
): Array<{ tarefaId: string; tarefaNome: string; tarefaPeso: number; prazoFim: Date | null; usuarioId: string; usuarioNome: string }> {
  if (membros.length === 0 || tarefas.length === 0) return [];

  // Inicializa carga de cada morador
  const cargas: CargaMorador[] = membros.map((m) => ({
    uid: m.uid,
    nome: m.nome,
    cargaTotal: 0,
  }));

  // Ordena tarefas por peso decrescente (as mais pesadas primeiro)
  // Isso melhora o equilíbrio no algoritmo greedy.
  const tarefasOrdenadas = [...tarefas].sort((a, b) => b.tarefaPeso - a.tarefaPeso);

  return tarefasOrdenadas.map((t) => {
    // Embaralha ligeiramente para evitar que o mesmo morador sempre receba tarefas
    // quando há empate de carga (pequena aleatoriedade)
    cargas.sort((a, b) => {
      const diff = a.cargaTotal - b.cargaTotal;
      // Em caso de empate, aleatoriza
      return diff !== 0 ? diff : Math.random() - 0.5;
    });

    const escolhido = cargas[0];
    escolhido.cargaTotal += t.tarefaPeso;

    return {
      tarefaId: t.tarefaId,
      tarefaNome: t.tarefaNome,
      tarefaPeso: t.tarefaPeso,
      prazoFim: t.prazoFim,
      usuarioId: escolhido.uid,
      usuarioNome: escolhido.nome,
    };
  });
}

// ---------------------------------------------------------------------------
// Função principal: rodar o motor de rotação
// ---------------------------------------------------------------------------

export interface OpcoesSorteio {
  /** Se informado, os ciclos com índice < cicloPularAte serão ignorados (já publicados). */
  cicloPularAte?: number; // 0-based index
}

/**
 * Executa o motor de rotação completo para um mês.
 *
 * @param tarefas      Lista de tarefas ativas da moradia.
 * @param membros      Lista de moradores participantes do sorteio.
 * @param ano          Ano do mês a sortear.
 * @param mes          Mês (0–11) a sortear.
 * @param opcoes       Opções como pular ciclos já publicados.
 */
export function executarMotorRotacao(
  tarefas: Tarefa[],
  membros: MembroParaSorteio[],
  ano: number,
  mes: number,
  opcoes: OpcoesSorteio = {},
): ResultadoMotor {
  const { cicloPularAte = 0 } = opcoes;
  const intervalos = calcularCiclosDoMes(ano, mes);

  // Filtra apenas tarefas ativas e disponíveis para sorteio
  const tarefasAtivas = tarefas.filter((t) => t.ativa && t.disponivelParaSorteio);

  const ciclosResultado: AtribuicaoCiclo[] = intervalos.map((intervalo, idx) => {
    const numeroCiclo = idx + 1; // 1-based

    // Se este ciclo já foi publicado, retorna vazio (será preenchido com dados existentes)
    if (idx < cicloPularAte) {
      return {
        numeroCiclo,
        inicioCiclo: intervalo.inicio,
        fimCiclo: intervalo.fim,
        atribuicoes: [], // será ignorado / não regravado
      };
    }

    // Monta a lista de instâncias para este ciclo
    const instanciasNesteCiclo: Array<{
      tarefaId: string;
      tarefaNome: string;
      tarefaPeso: number;
      prazoFim: Date | null;
    }> = [];

    for (const tarefa of tarefasAtivas) {
      const quantidades = instanciasPorCiclo(tarefa);
      const qtd = quantidades[idx];

      for (let i = 0; i < qtd; i++) {
        let prazoFim: Date | null = null;
        if (tarefa.prazoConclusaoDias !== null) {
          prazoFim = new Date(intervalo.inicio);
          prazoFim.setDate(prazoFim.getDate() + tarefa.prazoConclusaoDias);
        }

        instanciasNesteCiclo.push({
          tarefaId: tarefa.id,
          tarefaNome: tarefa.nome,
          tarefaPeso: tarefa.pesoDificuldade,
          prazoFim,
        });
      }
    }

    const atribuicoes = distribuirEntreMoradores(instanciasNesteCiclo, membros);

    return {
      numeroCiclo,
      inicioCiclo: intervalo.inicio,
      fimCiclo: intervalo.fim,
      atribuicoes,
    };
  });

  return { mes, ano, ciclos: ciclosResultado };
}

// ---------------------------------------------------------------------------
// Utilitário: qual ciclo está ativo agora?
// ---------------------------------------------------------------------------

/**
 * Retorna o índice (0-based) do ciclo ativo no mês/ano informado,
 * ou -1 se nenhum ciclo estiver ativo.
 */
export function cicloAtivoIndex(
  ano: number,
  mes: number,
  agora: Date = new Date(),
): number {
  const ciclos = calcularCiclosDoMes(ano, mes);
  return ciclos.findIndex((c) => agora >= c.inicio && agora <= c.fim);
}
