import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BotaoPill } from '../components/onboarding/BotaoPill';
import { cores, fontes, medidas } from '../components/onboarding/tema';

type Slide = {
  id: string;
  titulo: string;
  descricao: string;
  imagem: ImageSourcePropType;
};

const SLIDES: Slide[] = [
  {
    id: 'dividir',
    titulo: 'Divida as tarefas',
    descricao: 'Distribua os afazeres domésticos de forma equilibrada e rotativa entre todos da casa.',
    imagem: require('../../assets/images/onboarding/divida.png'),
  },
  {
    id: 'acompanhar',
    titulo: 'Acompanhe o ciclo',
    descricao: 'Monitore os prazos semanais e ganhe pontos mantendo as tarefas da casa sempre em dia.',
    imagem: require('../../assets/images/onboarding/acompanhe.png'),
  },
  {
    id: 'trocar',
    titulo: 'Troque quando precisar',
    descricao: 'Teve um imprevisto? Troque tarefas de forma anônima, sem saber com quem está trocando.',
    imagem: require('../../assets/images/onboarding/troque.png'),
  },
];

function SlideItem({ slide, largura, altura }: { slide: Slide; largura: number; altura: number }) {
  return (
    <View style={[styles.slide, { width: largura, height: altura }]}>
      <Image source={slide.imagem} style={styles.imagem} accessible={false} />
      <Text
        style={styles.titulo}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        accessibilityRole="header"
      >
        {slide.titulo}
      </Text>
      <Text style={styles.descricao}>{slide.descricao}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width: largura } = useWindowDimensions();
  const listaRef = useRef<FlatList<Slide>>(null);
  const [indice, setIndice] = useState(0);
  const [alturaLista, setAlturaLista] = useState(0);

  const ehUltimo = indice === SLIDES.length - 1;

  const concluir = () => router.replace('/boas-vindas');

  const avancar = () => {
    if (ehUltimo) {
      concluir();
      return;
    }
    const proximo = indice + 1;
    listaRef.current?.scrollToIndex({ index: proximo, animated: true });
    setIndice(proximo);
  };

  const aoTerminarRolagem = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndice(Math.round(evento.nativeEvent.contentOffset.x / largura));
  };

  return (
    <View style={[styles.tela, { paddingTop: insets.top }]}>
      {/* A altura do cabeçalho é fixa para o conteúdo não pular quando o "Pular" some no último slide. */}
      <View style={styles.cabecalho}>
        {!ehUltimo && (
          <Pressable
            onPress={concluir}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Pular apresentação"
          >
            <Text style={styles.pular}>Pular</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listaRef}
        data={SLIDES}
        keyExtractor={(slide) => slide.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        style={styles.lista}
        onLayout={(evento) => setAlturaLista(evento.nativeEvent.layout.height)}
        onMomentumScrollEnd={aoTerminarRolagem}
        getItemLayout={(_, posicao) => ({
          length: largura,
          offset: largura * posicao,
          index: posicao,
        })}
        renderItem={({ item }) => <SlideItem slide={item} largura={largura} altura={alturaLista} />}
      />

      <View
        style={[styles.rodape, { paddingBottom: Math.max(insets.bottom, medidas.margemInferiorMinima) }]}
      >
        <View
          style={styles.pontos}
          accessible
          accessibilityLabel={`Passo ${indice + 1} de ${SLIDES.length}`}
        >
          {SLIDES.map((slide, posicao) => (
            <View key={slide.id} style={[styles.ponto, posicao === indice && styles.pontoAtivo]} />
          ))}
        </View>
        <BotaoPill titulo={ehUltimo ? 'Começar' : 'Avançar'} onPress={avancar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  cabecalho: {
    height: 49,
    paddingTop: 8,
    paddingHorizontal: medidas.margemTela,
    alignItems: 'flex-end',
  },
  pular: {
    fontFamily: fontes.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: cores.texto,
    includeFontPadding: false,
  },
  lista: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagem: {
    width: 200,
    height: 200,
  },
  titulo: {
    alignSelf: 'stretch',
    marginTop: 50,
    paddingHorizontal: medidas.margemTela,
    textAlign: 'center',
    fontFamily: fontes.titulo,
    fontSize: 28,
    lineHeight: 36,
    color: cores.titulo,
    includeFontPadding: false,
  },
  descricao: {
    marginTop: 12,
    paddingHorizontal: 32,
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
  pontos: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
    backgroundColor: cores.borda,
  },
  pontoAtivo: {
    backgroundColor: cores.primaria,
  },
});
