import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, fontes, medidas } from './onboarding/tema';

type Props = {
  mensagem?: string;
};

/**
 * Tela de carregamento (splash em JS). Use enquanto o app descobre se há usuário logado
 * e carrega a moradia.
 */
export function TelaCarregando({ mensagem = 'Carregando sua moradia...' }: Props) {
  const insets = useSafeAreaInsets();
  const giro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacao = Animated.loop(
      Animated.timing(giro, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animacao.start();
    return () => animacao.stop();
  }, [giro]);

  const rotacao = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <ImageBackground
      source={require('../../assets/images/onboarding/fundo-carregando.png')}
      style={styles.fundo}
      resizeMode="cover"
    >
      <View style={styles.centro}>
        <Image
          source={require('../../assets/images/onboarding/logo-revezo.png')}
          style={styles.logo}
          accessibilityLabel="Revezo"
        />
      </View>

      <View
        style={[styles.rodape, { paddingBottom: Math.max(insets.bottom, medidas.margemInferiorMinima) }]}
      >
        <Animated.Image
          source={require('../../assets/images/onboarding/spinner.png')}
          style={[styles.spinner, { transform: [{ rotate: rotacao }] }]}
          accessible={false}
        />
        <Text style={styles.mensagem} accessibilityLiveRegion="polite">
          {mensagem}
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
  },
  // No protótipo o desenho do logo fica ~33pt acima do centro da tela.
  // O arquivo tem ~6pt de folga transparente embaixo, daí o paddingBottom de 60.
  centro: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  logo: {
    width: 82,
    height: 101.5,
  },
  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  // spinner.png tem 72px (@2x), ou seja, 36pt.
  spinner: {
    width: 36,
    height: 36,
  },
  mensagem: {
    marginTop: 16,
    fontFamily: fontes.regular,
    fontSize: 15,
    lineHeight: 20,
    color: cores.branco,
    includeFontPadding: false,
  },
});
