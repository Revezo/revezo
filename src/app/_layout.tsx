import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import Feather from '@expo/vector-icons/Feather';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { TelaCarregando } from '../components/TelaCarregando';
import { NavBarGlobal } from '../components/navigation/NavBarGlobal';
import { colors } from '../constants/theme';
import { SessaoProvider, useSessao } from '../contexts/SessaoContext';

// Tempo mínimo da tela de carregamento na abertura do app
const TEMPO_MINIMO_CARREGAMENTO_MS = 3000;

function AppNavegacao() {
  const { carregando } = useSessao();
  const [tempoMinimoPassou, setTempoMinimoPassou] = useState(false);

  useEffect(() => {
    const temporizador = setTimeout(() => setTempoMinimoPassou(true), TEMPO_MINIMO_CARREGAMENTO_MS);
    return () => clearTimeout(temporizador);
  }, []);

  const exibindoSplash = carregando || !tempoMinimoPassou;

  return (
    <View style={styles.flex}>
      <Stack screenOptions={{ headerShown: false, contentStyle: styles.fundoTelas }} />
      {/* Nav-bar fixa por cima de todas as telas (aparece só onde faz sentido) */}
      <NavBarGlobal />
      {/* Splash só na abertura do app; as telas já vão se montando por baixo */}
      {exibindoSplash && (
        <View style={StyleSheet.absoluteFill}>
          <TelaCarregando />
        </View>
      )}
    </View>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts({
    'Sora-Bold': Sora_700Bold,
    'Sora-ExtraBold': Sora_800ExtraBold,
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    ...Feather.font,
  });

  return (
    <SessaoProvider>
      {fontsLoaded ? (
        <AppNavegacao />
      ) : (
        <View style={styles.carregandoFontes}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SessaoProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Evita o "flash" branco enquanto uma tela nova entra
  fundoTelas: {
    backgroundColor: colors.background,
  },
  carregandoFontes: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
