import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { Input } from '../components/ui/Input';
import { colors, typography } from '../constants/theme';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const entrar = async () => {
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      router.replace('/');
    } catch (erro: any) {
      Alert.alert('Não foi possível entrar', erro.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header title="Entrar" showBack={false} />

        <Input 
          label="E-mail" 
          placeholder="Ex: morador@revezo.com.br" 
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

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
        </TouchableOpacity>

        <Button 
          title="Entrar" 
          isLoading={carregando}
          onPress={entrar} 
          style={styles.loginButton} 
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ainda não tem conta? </Text>
          <TouchableOpacity onPress={() => router.push('/cadastro')}>
            <Text style={styles.footerLink}>Cadastre-se</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 },
  forgotPasswordText: { ...typography.secondaryBold, color: colors.primary },
  loginButton: { marginBottom: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { ...typography.secondary, color: colors.textGray },
  footerLink: { ...typography.secondaryBold, color: colors.primary },
});