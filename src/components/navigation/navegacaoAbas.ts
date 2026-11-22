import { Alert } from 'react-native';
import { BottomNavTab } from './BottomNavBar';

/** Abas que já possuem tela própria dentro do grupo `(tabs)`. */
export const ROTA_DA_ABA: Partial<Record<BottomNavTab, '/' | '/ciclo'>> = {
  home: '/',
  ciclo: '/ciclo',
};

/** Aviso para as abas que ainda não foram desenvolvidas. */
export function avisarAbaIndisponivel(tab: BottomNavTab) {
  if (tab === 'perfil') {
    Alert.alert('Perfil', 'A tela de perfil completa será desenvolvida em breve!');
    return;
  }
  Alert.alert(
    tab.charAt(0).toUpperCase() + tab.slice(1),
    'Esta funcionalidade será disponibilizada na próxima etapa.',
  );
}
