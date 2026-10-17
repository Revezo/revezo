import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { cores, fontes, medidas } from './tema';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
};

export function BotaoPill({ titulo, onPress, variante = 'primario' }: Props) {
  const primario = variante === 'primario';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primario ? styles.primario : styles.secundario,
        pressed && styles.pressionado,
      ]}
    >
      <Text style={[styles.texto, primario ? styles.textoPrimario : styles.textoSecundario]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    height: medidas.alturaBotao,
    borderRadius: medidas.alturaBotao / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primario: {
    backgroundColor: cores.primaria,
    // Brilho azul sob o botão, como no protótipo (deslocamento 8, desfoque ~16, opacidade ~25%).
    shadowColor: cores.primaria,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  secundario: {
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  pressionado: {
    opacity: 0.88,
  },
  texto: {
    fontFamily: fontes.bold,
    fontSize: 16,
    includeFontPadding: false,
  },
  textoPrimario: {
    color: cores.branco,
  },
  textoSecundario: {
    color: cores.titulo,
  },
});
