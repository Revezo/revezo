import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { Input } from '../components/ui/Input';
import { colors, typography } from '../constants/theme';
import { auth } from '../firebaseConfig';

export default function CadastroScreen() {
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Header title="Criar conta" />

        <Input 
          label="Como quer ser chamado?" 
          placeholder="Seu nome ou apelido" 
          value={nome}
          onChangeText={setNome}
        />
        <Input 
          label="E-mail" 
          placeholder="Ex: seu@email.com" 
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
          label="Confirmar Senha" 
          placeholder="Repita a senha criada" 
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          secureTextEntry 
        />

        <View style={styles.termsContainer}>
          <TouchableOpacity 
            style={[styles.checkbox, termsAccepted && styles.checkboxActive]} 
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            {termsAccepted && <Feather name="check" size={14} color={colors.textWhite} />}
          </TouchableOpacity>
          <Text style={styles.termsText}>
            Estou de acordo com os <Text style={styles.linkText}>Termos de Uso</Text> e <Text style={styles.linkText}>Políticas de Privacidade</Text>.
          </Text>
        </View>

        <Button 
          title="Cadastrar e Continuar" 
          isLoading={carregando}
          disabled={!termsAccepted}
          onPress={criarConta} 
          style={styles.registerButton} 
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já faz parte de um lar? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footerLink}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
  termsContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 32, marginTop: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: colors.stroke,
    backgroundColor: colors.inputBackground, marginRight: 12, marginTop: 2, justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { ...typography.secondary, color: colors.textGray, flex: 1, lineHeight: 20 },
  linkText: { color: colors.primary, ...typography.secondaryBold },
  registerButton: { marginBottom: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { ...typography.secondary, color: colors.textGray },
  footerLink: { ...typography.secondaryBold, color: colors.primary },
});