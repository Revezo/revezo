import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoPill } from '../components/onboarding/BotaoPill';
import { medidas } from '../components/onboarding/tema';
import { GradientHero } from '../components/ui/GradientHero';
import { LogoRevezo } from '../components/ui/Logo';
import { colors, typography } from '../constants/theme';

const SOBREPOSICAO = 40;

export default function BoasVindasScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const alturaHero = Math.max(240, Math.min(height * 0.6, height - 360));

  return (
    <View style={styles.tela}>
      <StatusBar style="light" />

      <GradientHero height={alturaHero}>
        <View
          style={[
            styles.heroConteudo,
            { paddingTop: insets.top, paddingBottom: SOBREPOSICAO },
          ]}
        >
          <LogoRevezo color={colors.textWhite} size={132} />
        </View>
      </GradientHero>

      <View
        style={[
          styles.cartao,
          { paddingBottom: Math.max(insets.bottom, medidas.margemInferiorMinima) },
        ]}
      >
        <Text style={styles.titulo}>
          Bem-vindo ao{'\n'}
          <Text style={styles.tituloDestaque}>Revezo</Text>
        </Text>
        <Text style={styles.descricao}>
          A harmonia ideal para gerenciar e revezar as tarefas do seu lar de forma transparente.
        </Text>

        <View style={styles.acoes}>
          <BotaoPill titulo="Criar uma conta" onPress={() => router.push('/cadastro')} />
          <View style={styles.espaco} />
          <BotaoPill
            titulo="Entrar"
            variante="secundario"
            onPress={() => router.push('/login')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: colors.inputBackground,
  },
  heroConteudo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartao: {
    flex: 1,
    marginTop: -SOBREPOSICAO,
    backgroundColor: colors.inputBackground,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 34,
    paddingHorizontal: medidas.margemTela,
    boxShadow: '0 -10px 30px -12px rgba(16, 48, 176, 0.25)',
  },
  titulo: {
    ...typography.title,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
    color: colors.textDark,
  },
  tituloDestaque: {
    color: colors.primary,
  },
  descricao: {
    ...typography.secondary,
    marginTop: 14,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.textGray,
  },
  acoes: {
    marginTop: 'auto',
    paddingTop: 24,
  },
  espaco: {
    height: medidas.espacoEntreBotoes,
  },
});