import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { HouseEntranceIllustration } from '@/components/ui/HouseEntranceIllustration';
import { Input } from '@/components/ui/Input';
import { colors, typography } from '@/constants/theme';
import { auth } from '@/firebaseConfig';
import { entrarMoradiaComCodigo } from '@/services/moradia';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EntrarMoradiaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [codigo, setCodigo] = useState('');
  const [apelido, setApelido] = useState('');
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleEntrar = async () => {
    const codigoFormatado = codigo.trim().toUpperCase();
    if (!codigoFormatado) {
      setErroCodigo('Código inválido. Verifique o código e tente novamente.');
      return;
    }

    const usuarioAtual = auth.currentUser;
    if (!usuarioAtual) {
      Alert.alert('Erro', 'Você precisa estar logado para entrar em uma moradia.');
      return;
    }

    setCarregando(true);
    setErroCodigo(null);

    try {
      await entrarMoradiaComCodigo(usuarioAtual, codigoFormatado, apelido);
      router.replace('/');
    } catch (erro: any) {
      setErroCodigo(erro.message || 'Código inválido. Verifique o código e tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Entrar na Moradia" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            <View style={styles.imageCard}>
              <HouseEntranceIllustration size={88} color="#2563EB" />
            </View>

            <Text style={styles.subtitle}>
              Digite o código de convite recebido para entrar em uma moradia existente.
            </Text>

            <View style={styles.form}>
              <Input
                variant="outline"
                label="CÓDIGO DE CONVITE"
                placeholder="Ex: MOR-7K2X"
                value={codigo}
                onChangeText={(val) => {
                  setCodigo(val.toUpperCase());
                  if (erroCodigo) setErroCodigo(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                error={erroCodigo}
              />

              <Input
                variant="outline"
                label="SEU APELIDO NA MORADIA"
                placeholder="Como quer ser chamado?"
                value={apelido}
                onChangeText={setApelido}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Entrar na Moradia"
              onPress={handleEntrar}
              isLoading={carregando}
              disabled={carregando}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    paddingTop: 16,
  },
  imageCard: {
    width: 110,
    height: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  subtitle: {
    ...typography.secondary,
    color: colors.textGray,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  footer: {
    width: '100%',
    paddingTop: 16,
  },
  button: {
    borderRadius: 24,
    height: 56,
  },
});
