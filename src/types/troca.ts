/**
 * Tipos do Sistema de Trocas de Tarefas (RF13, RF14, RNF5).
 *
 * Todas as trocas acontecem dentro do ciclo ativo mantendo o anonimato
 * dos moradores envolvidos em todas as etapas.
 */

export type StatusTroca = 'pendente' | 'aceita' | 'recusada';

export interface PropostaTroca {
  id: string;
  moradiaId: string;
  cicloId: string;
  proponenteId: string;
  proponenteNome: string;
  destinatarioId: string;
  destinatarioNome: string;
  instanciaOrigemId: string;
  tarefaOrigemNome: string;
  tarefaOrigemPeso: number;
  tarefaOrigemDescricao?: string;
  tarefaOrigemPrazo: Date | null;
  instanciaSolicitadaId: string;
  tarefaSolicitadaNome: string;
  tarefaSolicitadaPeso: number;
  tarefaSolicitadaDescricao?: string;
  tarefaSolicitadaPrazo: Date | null;
  status: StatusTroca;
  motivoRecusa?: string;
  cicloFim: Date | null;
  criadaEm: Date;
  respondidaEm: Date | null;
}

export const MOTIVOS_RECUSA_NEUTROS = [
  'Prefiro manter minha tarefa atual',
  'Não tenho disponibilidade neste ciclo',
  'Outro motivo (sem identificar usuários)',
] as const;
