import { Alert } from 'react-native';
import { BottomNavTab } from './BottomNavBar';

/** Abas que já possuem tela própria dentro do grupo `(tabs)`. */
export const ROTA_DA_ABA: Partial<Record<BottomNavTab, '/' | '/ciclo' | '/ranking' | '/perfil'>> = {
  home: '/',
  ciclo: '/ciclo',
  ranking: '/ranking',
  perfil: '/perfil',
};

/** Aviso para as abas que ainda não foram desenvolvidas. */
export function avisarAbaIndisponivel(tab: BottomNavTab) {
  Alert.alert(
    tab.charAt(0).toUpperCase() + tab.slice(1),
    'Esta funcionalidade será disponibilizada na próxima etapa.',
  );
}
