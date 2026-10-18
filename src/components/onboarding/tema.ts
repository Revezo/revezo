/**
 * Tokens visuais do onboarding, medidos diretamente do protótipo.
 * Se o projeto já tiver um arquivo de tema em src/constants, é só apontar estes valores para lá.
 */
export const cores = {
  fundo: '#F8FAFC',
  primaria: '#2B7FFF',
  titulo: '#00171F',
  texto: '#919191',
  borda: '#DDE2E8',
  branco: '#FFFFFF',
} as const;

/** Nomes exatamente como registrados no useFonts do src/app/_layout.tsx. */
export const fontes = {
  titulo: 'Sora-Bold',
  regular: 'Manrope-Regular',
  semibold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
} as const;

export const medidas = {
  margemTela: 24,
  alturaBotao: 52,
  espacoEntreBotoes: 16,
  /** Respiro mínimo abaixo do último elemento quando o aparelho não tem barra de gestos. */
  margemInferiorMinima: 24,
} as const;
