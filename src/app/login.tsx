import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientHero } from '../components/ui/GradientHero';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LogoRevezo } from '../components/ui/Logo';
import { colors, Spacing, typography } from '../constants/theme';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const entrar = async () => {
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      router.replace('/escolher-fluxo');
    } catch (erro: any) {
      Alert.alert('Não foi possível entrar', erro.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <GradientHero height={290} style={{ paddingTop: insets.top }}>
          <View style={styles.heroHead}>
            <LogoRevezo color={colors.textWhite} size={50} />
            <Text style={styles.heroTitle}>Vamos entrar.</Text>
            <Text style={styles.heroSubtitle}>Entre e continue de onde a gente parou.</Text>
          </View>
        </GradientHero>

        <View style={styles.sheet}>
          
          <TouchableOpacity 
            style={styles.pillLink} 
            activeOpacity={0.7} 
            onPress={() => router.push('/cadastro')}
          >
            <Text style={styles.pillText}>
              Ainda não tem conta? <Text style={styles.pillTextBold}>Cadastre-se</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <Input 
              label="E-mail" 
              placeholder="morador@revezo.com.br" 
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input 
              label="Senha" 
              placeholder="Digite sua senha de acesso" 
              value={senha}
              onChangeText={setSenha}
              secureTextEntry 
            />

            <View style={styles.asideRow}>
              <TouchableOpacity>
                <Text style={styles.forgotPassword}>Esqueceu sua senha?</Text>
              </TouchableOpacity>
            </View>

            <Button 
              title="Entrar" 
              isLoading={carregando}
              onPress={entrar} 
              style={styles.btn} 
            />
          </View>
        </View>

      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.inputBackground },
  scrollContent: { flexGrow: 1 },
  heroHead: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  heroTitle: {
    ...typography.title,
    fontSize: 29,
    color: colors.textWhite,
    marginTop: Spacing.two,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    ...typography.secondary,
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: Spacing.one,
  },
  sheet: {
    flex: 1,
    marginTop: -34,
    backgroundColor: colors.inputBackground,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: Spacing.four,
    paddingHorizontal: 28,
    paddingBottom: 34,
    boxShadow: '0 -4px 12px rgba(11, 27, 51, 0.05)',
    elevation: 5,
  },
  pillLink: {
    backgroundColor: '#EEF4FF',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: Spacing.four,
    alignItems: 'center',
  },
  pillText: { ...typography.secondary, color: '#4E6288', fontSize: 14 },
  pillTextBold: { ...typography.secondaryBold, color: colors.primary },
  form: { gap: 4 },
  asideRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -4, marginBottom: Spacing.four },
  forgotPassword: { ...typography.secondaryBold, fontSize: 13, color: colors.primary },
  btn: { backgroundColor: colors.primary, height: 56, borderRadius: 28 },
});