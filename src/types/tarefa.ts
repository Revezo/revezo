/**
 * RF4 - Cadastrar tarefa
 * Modelo de dados, validações e regras de sorteio usadas pelo cadastro de tarefas.
 */

export type FrequenciaTipo = 'diaria' | 'semanal' | 'mensal';

export interface ParametrosDiaria {
  /** Quantas vezes a tarefa se repete por dia (1 a 10). */
  vezesPorDia: number;
}

export interface ParametrosSemanal {
  /** Dias da semana em que a tarefa acontece. 0 = domingo ... 6 = sábado. */
  diasSemana: number[];
}

export interface ParametrosMensal {
  /** Dia do mês em que a tarefa acontece (1 a 31). */
  diaDoMes: number;
}

export type Frequencia =
  | { tipo: 'diaria'; parametros: ParametrosDiaria }
  | { tipo: 'semanal'; parametros: ParametrosSemanal }
  | { tipo: 'mensal'; parametros: ParametrosMensal };

/** Dados de entrada do RF4. */
export interface DadosNovaTarefa {
  nome: string;
  frequencia: Frequencia;
  pesoDificuldade: number;
  /** Opcional: prazo, em dias, para concluir a tarefa depois de sorteada. */
  prazoConclusaoDias: number | null;
  /** Opcional: horas mínimas entre o sorteio e a execução da tarefa. */
  janelaAntecedenciaHoras: number | null;
}

export interface Tarefa extends DadosNovaTarefa {
  id: string;
  moradiaId: string;
  ativa: boolean;
  disponivelParaSorteio: boolean;
  proximoSorteioElegivel: Date | null;
  criadaPor: string;
  criadaEm: Date | null;
}

export const PESO_MINIMO = 1;
export const PESO_MAXIMO = 5;
export const NOME_MINIMO = 3;
export const NOME_MAXIMO = 80;
export const PRAZO_MAXIMO_DIAS = 365;
export const JANELA_MAXIMA_HORAS = 720;

export const ROTULOS_PESO: Record<number, string> = {
  1: 'Muito leve',
  2: 'Leve',
  3: 'Média',
  4: 'Pesada',
  5: 'Muito pesada',
};

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** O sorteio semanal acontece toda segunda-feira às 8h. */
export const DIA_DO_SORTEIO = 1;
export const HORA_DO_SORTEIO = 8;

export function paraInteiro(texto: string): number {
  const numero = parseInt(String(texto).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(numero) ? 0 : numero;
}

/** Primeiro sorteio semanal que acontece depois da data de referência. */
export function proximoSorteio(referencia: Date = new Date()): Date {
  const data = new Date(referencia);
  data.setHours(HORA_DO_SORTEIO, 0, 0, 0);

  let tentativas = 0;
  while ((data <= referencia || data.getDay() !== DIA_DO_SORTEIO) && tentativas < 10) {
    data.setDate(data.getDate() + 1);
    data.setHours(HORA_DO_SORTEIO, 0, 0, 0);
    tentativas += 1;
  }
  return data;
}

/**
 * Sorteio em que a tarefa entra de fato.
 * Se a janela mínima de antecedência não couber antes do próximo sorteio,
 * a tarefa é empurrada para o sorteio seguinte.
 */
export function proximoSorteioElegivel(
  janelaAntecedenciaHoras: number | null,
  agora: Date = new Date(),
): Date {
  const horas = janelaAntecedenciaHoras ?? 0;
  const limite = new Date(agora.getTime() + horas * 60 * 60 * 1000);
  return proximoSorteio(limite);
}

export function descreverFrequencia(frequencia: Frequencia): string {
  switch (frequencia.tipo) {
    case 'diaria': {
      const vezes = frequencia.parametros.vezesPorDia;
      return vezes <= 1 ? 'Diária' : `Diária, ${vezes}x por dia`;
    }
    case 'semanal': {
      const dias = [...frequencia.parametros.diasSemana].sort((a, b) => a - b);
      if (dias.length === 0) return 'Semanal';
      if (dias.length === 7) return 'Semanal, todos os dias';
      return `Semanal, ${dias.map((dia) => DIAS_SEMANA[dia]).join(', ')}`;
    }
    case 'mensal':
      return `Mensal, todo dia ${frequencia.parametros.diaDoMes}`;
    default:
      return 'Frequência não definida';
  }
}

export function descreverPrazo(dias: number | null): string {
  if (dias === null) return 'Sem prazo definido';
  return dias === 1 ? 'Concluir em 1 dia' : `Concluir em ${dias} dias`;
}

export function descreverJanela(horas: number | null): string {
  if (horas === null) return 'Sem antecedência mínima';
  return horas === 1 ? 'Avisar com 1 hora de antecedência' : `Avisar com ${horas} horas de antecedência`;
}

export function formatarDataHora(data: Date): string {
  const p = (valor: number) => String(valor).padStart(2, '0');
  return `${p(data.getDate())}/${p(data.getMonth() + 1)}/${data.getFullYear()} às ${p(data.getHours())}:${p(data.getMinutes())}`;
}

/** Retorna a lista de erros dos dados de entrada. Lista vazia = dados válidos. */
export function validarDadosTarefa(dados: DadosNovaTarefa): string[] {
  const erros: string[] = [];
  const nome = dados.nome.trim();

  if (nome.length < NOME_MINIMO) {
    erros.push(`O nome da tarefa precisa de pelo menos ${NOME_MINIMO} caracteres.`);
  }
  if (nome.length > NOME_MAXIMO) {
    erros.push(`O nome da tarefa pode ter no máximo ${NOME_MAXIMO} caracteres.`);
  }

  const peso = dados.pesoDificuldade;
  if (!Number.isInteger(peso) || peso < PESO_MINIMO || peso > PESO_MAXIMO) {
    erros.push(`O peso de dificuldade deve ficar entre ${PESO_MINIMO} e ${PESO_MAXIMO}.`);
  }

  switch (dados.frequencia.tipo) {
    case 'diaria': {
      const vezes = dados.frequencia.parametros.vezesPorDia;
      if (!Number.isInteger(vezes) || vezes < 1 || vezes > 10) {
        erros.push('Na frequência diária, informe de 1 a 10 repetições por dia.');
      }
      break;
    }
    case 'semanal': {
      const dias = dados.frequencia.parametros.diasSemana;
      if (dias.length === 0) {
        erros.push('Na frequência semanal, escolha pelo menos um dia da semana.');
      }
      if (dias.some((dia) => !Number.isInteger(dia) || dia < 0 || dia > 6)) {
        erros.push('Há um dia da semana inválido na seleção.');
      }
      break;
    }
    case 'mensal': {
      const dia = dados.frequencia.parametros.diaDoMes;
      if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
        erros.push('Na frequência mensal, informe um dia entre 1 e 31.');
      }
      break;
    }
    default:
      erros.push('Escolha a frequência da tarefa.');
  }

  const prazo = dados.prazoConclusaoDias;
  if (prazo !== null && (!Number.isInteger(prazo) || prazo < 1 || prazo > PRAZO_MAXIMO_DIAS)) {
    erros.push(`O prazo de conclusão deve ficar entre 1 e ${PRAZO_MAXIMO_DIAS} dias.`);
  }

  const janela = dados.janelaAntecedenciaHoras;
  if (janela !== null && (!Number.isInteger(janela) || janela < 1 || janela > JANELA_MAXIMA_HORAS)) {
    erros.push(`A janela mínima de antecedência deve ficar entre 1 e ${JANELA_MAXIMA_HORAS} horas.`);
  }

  if (prazo !== null && janela !== null && janela > prazo * 24) {
    erros.push('A antecedência mínima não pode ser maior que o prazo de conclusão.');
  }

  return erros;
}
