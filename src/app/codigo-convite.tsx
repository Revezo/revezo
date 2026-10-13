import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { colors } from '@/constants/theme';

export default function CodigoConviteScreen() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const router = useRouter();

  async function copiarCodigo() {
    if (codigo) {
      await Clipboard.setStringAsync(codigo);
      Alert.alert('Sucesso!', 'O código foi copiado para sua área de transferência.');
    }
  }

  async function compartilharCodigo() {
    try {
      await Share.share({
        message: `Venha participar da minha moradia no Revezo! Use o código de convite: ${codigo}`,
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o código.');
    }
  }

  return (
    <View style={styles.container}>
      <Header title="" />

      <View style={styles.content}>
        <View style={styles.imagePlaceholder}>
          <Text style={{ fontSize: 40 }}>🏡</Text>
        </View>

        <Text style={styles.title}>Moradia Criada!</Text>
        <Text style={styles.subtitle}>
          Compartilhe o código abaixo para convidar moradores para a sua casa.
        </Text>

        <Text style={styles.label}>CÓDIGO DE CONVITE</Text>
        <Text style={styles.codigoDestaque}>{codigo || 'MOR-XXXX'}</Text>
      </View>

      <View style={styles.footer}>
        <Button 
          title="Copiar Código" 
          onPress={copiarCodigo} 
        />
        
        <TouchableOpacity style={styles.shareButton} onPress={compartilharCodigo}>
          <Text style={styles.shareText}>🔗 Compartilhar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeLink} onPress={() => router.push('/')}>
          <Text style={styles.homeLinkText}>Ir para a Home →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#E0F2FE', 
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textDark, 
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textGray,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textGray,
    letterSpacing: 1,
    marginBottom: 8,
  },
  codigoDestaque: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  shareButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  shareText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  homeLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  homeLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});