import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BotaoPill } from '../components/onboarding/BotaoPill';
import { cores, fontes, medidas } from '../components/onboarding/tema';

export default function BoasVindasScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tela, { paddingTop: insets.top }]}>
      <View style={styles.conteudo}>
        <Image
          source={require('../../assets/images/onboarding/casa.png')}
          style={styles.imagem}
          accessible={false}
        />
        <Text style={styles.descricao}>
          A harmonia ideal para gerenciar e revezar as tarefas do seu lar de forma transparente.
        </Text>
      </View>

      <View
        style={[styles.rodape, { paddingBottom: Math.max(insets.bottom, medidas.margemInferiorMinima) }]}
      >
        <BotaoPill titulo="Criar uma conta" onPress={() => router.push('/cadastro')} />
        <View style={styles.espaco} />
        <BotaoPill titulo="Entrar" variante="secundario" onPress={() => router.push('/login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagem: {
    width: 220,
    height: 220,
  },
  descricao: {
    marginTop: 18,
    paddingHorizontal: 20,
    textAlign: 'center',
    fontFamily: fontes.regular,
    fontSize: 15,
    lineHeight: 23,
    color: cores.texto,
    includeFontPadding: false,
  },
  rodape: {
    paddingHorizontal: medidas.margemTela,
  },
  espaco: {
    height: medidas.espacoEntreBotoes,
  },
});
