import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert } from 'react-native';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Erro ao entrar', error.message);
    }
  };

  const handleCadastro = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, senha);
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Erro ao criar conta', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Revezo</Text>
      <TextInput
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Senha"
        value={senha}
        onChangeText={setSenha}
        style={styles.input}
        secureTextEntry
      />
      <Button title="Entrar" onPress={handleLogin} />
      <View style={{ marginVertical: 8 }} />
      <Button title="Criar conta" onPress={handleCadastro} color="green" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  titulo: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 16, borderRadius: 8, backgroundColor: '#fff' },
});
