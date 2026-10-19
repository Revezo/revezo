import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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

export default function CadastroScreen() {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [carregando, setCarregando] = useState(false);

  const criarConta = async () => {
    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }
    setCarregando(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), senha);
      router.replace('/');
    } catch (erro: any) {
      Alert.alert('Não foi possível criar a conta', erro.message);
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
            <Text style={styles.heroTitle}>Registre-se agora.</Text>
            <Text style={styles.heroSubtitle}>Leva um minuto. Depois, chame a galera da casa.</Text>
          </View>
        </GradientHero>

        <View style={styles.sheet}>
          
          <TouchableOpacity 
            style={styles.pillLink} 
            activeOpacity={0.7} 
            onPress={() => router.push('/login')}
          >
            <Text style={styles.pillText}>
              Já faz parte de um lar? <Text style={styles.pillTextBold}>Fazer login</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <Input 
              label="Como quer ser chamado?" 
              placeholder="Seu nome ou apelido" 
              value={nome}
              onChangeText={setNome}
            />
            <Input 
              label="E-mail" 
              placeholder="seu@email.com" 
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address" 
              autoCapitalize="none" 
            />
            <Input 
              label="Senha" 
              placeholder="Mínimo de 8 caracteres" 
              value={senha}
              onChangeText={setSenha}
              secureTextEntry 
            />
            <Input 
              label="Confirmar senha" 
              placeholder="Repita a senha criada" 
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry 
            />

            <TouchableOpacity 
              style={styles.checkContainer} 
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.box, termsAccepted && styles.boxChecked]}>
                {termsAccepted && <Feather name="check" size={14} color={colors.textWhite} />}
              </View>
              <Text style={styles.checkText}>
                Estou de acordo com os 
                <Text style={styles.linkBold}> Termos de Uso </Text>
                 e 
                <Text style={styles.linkBold}> Políticas de Privacidade</Text>
              </Text>
            </TouchableOpacity>

            <Button 
              title="Cadastrar e continuar" 
              isLoading={carregando}
              disabled={!termsAccepted}
              onPress={criarConta} 
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
  checkContainer: { flexDirection: 'row', alignItems: 'flex-start', marginTop: Spacing.two, 
    marginBottom: Spacing.four, gap: 10 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#B7C3D6', 
    backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { flex: 1, ...typography.secondary, fontSize: 12.5, color: colors.textGray, lineHeight: 18 },
  linkBold: { ...typography.secondaryBold, color: colors.primary },
  btn: { backgroundColor: colors.primary, height: 56, borderRadius: 28 },
});