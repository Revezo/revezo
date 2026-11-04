/**
 * Tipos do Motor de Rotação de Tarefas (Ciclos)
 *
 * Um "Ciclo" representa uma semana dentro do mês (1 de 4).
 * Uma "InstanciaTarefa" é a atribuição concreta de uma tarefa a um morador
 * dentro de um ciclo específico — equivale a uma relação M2M entre Tarefa e Usuário.
 */

export type StatusInstancia = 'pendente' | 'concluida' | 'atrasada';
export type StatusCiclo = 'futuro' | 'ativo' | 'encerrado';

export interface Ciclo {
  id: string;
  moradiaId: string;
  mes: number;         // 0–11
  ano: number;
  numeroCiclo: number; // 1–4
  inicioCiclo: Date;
  fimCiclo: Date;
  geradoEm: Date;
  status: StatusCiclo;
}

/**
 * Instância de uma tarefa atribuída a um morador num ciclo.
 * É o "documento de trabalho" que o morador enxerga e marca como concluído.
 */
export interface InstanciaTarefa {
  id: string;
  cicloId: string;
  numeroCiclo: number; // 1–4 (desnormalizado para queries mais simples)
  tarefaId: string;
  tarefaNome: string;
  tarefaPeso: number;
  moradiaId: string;
  usuarioId: string;
  usuarioNome: string;
  status: StatusInstancia;
  fotos: string[];
  atribuidaEm: Date;
  concluidaEm: Date | null;
  prazoFim: Date | null;
  descricao?: string;
}

/** Perfil mínimo de um morador necessário para o algoritmo de sorteio. */
export interface MembroParaSorteio {
  uid: string;
  nome: string;
}

/** Resultado do algoritmo de sorteio para um único ciclo. */
export interface AtribuicaoCiclo {
  numeroCiclo: number;
  inicioCiclo: Date;
  fimCiclo: Date;
  atribuicoes: {
    tarefaId: string;
    tarefaNome: string;
    tarefaPeso: number;
    prazoFim: Date | null;
    usuarioId: string;
    usuarioNome: string;
  }[];
}

/** Resultado completo do motor: 4 ciclos com todas as atribuições. */
export interface ResultadoMotor {
  mes: number;
  ano: number;
  ciclos: AtribuicaoCiclo[];
}
