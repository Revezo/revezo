import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoPill } from '../components/onboarding/BotaoPill';
import { medidas } from '../components/onboarding/tema';
import { GradientHero } from '../components/ui/GradientHero';
import { LogoRevezo } from '../components/ui/Logo';
import { colors, typography } from '../constants/theme';

// Quanto o cartão branco sobe sobre o gradiente.
const SOBREPOSICAO = 40;

export default function BoasVindasScreen() {
  const insets = useSafeAreaInsets();
  const [alturaHero, setAlturaHero] = useState(0);

  return (
    <View style={styles.tela}>
      <StatusBar style="light" />

      {/* O hero ocupa todo o espaço que o cartão não usa. */}
      <View
        style={styles.areaHero}
        onLayout={(e) => setAlturaHero(e.nativeEvent.layout.height)}
      >
        {alturaHero > 0 && (
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
        )}
      </View>

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
          Transforme a rotina da sua casa com uma divisão de tarefas simples e justa para todos
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
    backgroundColor: colors.primary,
  },
  areaHero: {
    flex: 1,
  },
  heroConteudo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartao: {
    marginTop: -SOBREPOSICAO,
    backgroundColor: colors.inputBackground,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 34,
    paddingHorizontal: medidas.margemTela,
    boxShadow: '0 -10px 30px -12px rgba(16, 48, 176, 0.25)',
  },
  titulo: {
    ...typography.titleExtraBold,
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
    marginTop: 32,
  },
  espaco: {
    height: medidas.espacoEntreBotoes,
  },
});