import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();
  
  // Se estivermos no ambiente web e o DOM já estiver disponível, podemos retornar direto,
  // ou simplesmente retornar o colorScheme do RN que já gerencia isso nativamente nas versões mais recentes do Expo.
  return colorScheme ?? 'light';
}