import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

type Modo = 'entrar' | 'criar';

export default function LoginScreen() {
  const [modo, setModo] = useState<Modo>('entrar');
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

  const criarConta = async () => {
    setCarregando(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), senha);
      // A moradia é criada (ou escolhida) na tela seguinte, não aqui —
      // isso deixa espaço para, no futuro, um usuário pertencer a mais de uma moradia.
      router.replace('/');
    } catch (erro: any) {
      Alert.alert('Não foi possível criar a conta', erro.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Revezo</Text>
      <Text style={styles.subtitulo}>Tarefas domésticas sorteadas toda semana</Text>

      <View style={styles.abas}>
        {(['entrar', 'criar'] as Modo[]).map((valor) => (
          <TouchableOpacity
            key={valor}
            style={[styles.aba, modo === valor && styles.abaAtiva]}
            onPress={() => setModo(valor)}
          >
            <Text style={[styles.abaTexto, modo === valor && styles.abaTextoAtivo]}>
              {valor === 'entrar' ? 'Entrar' : 'Criar conta'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

      <TouchableOpacity
        style={[styles.botao, carregando && styles.botaoDesativado]}
        onPress={modo === 'entrar' ? entrar : criarConta}
        disabled={carregando}
      >
        <Text style={styles.botaoTexto}>
          {carregando ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f4f5f4' },
  titulo: { fontSize: 30, fontWeight: '700', textAlign: 'center', color: '#1d2b24' },
  subtitulo: { fontSize: 14, color: '#6b7a72', textAlign: 'center', marginTop: 6, marginBottom: 28 },
  abas: {
    flexDirection: 'row',
    backgroundColor: '#e6eae7',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  aba: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  abaAtiva: { backgroundColor: '#fff' },
  abaTexto: { color: '#6b7a72', fontSize: 14 },
  abaTextoAtivo: { color: '#1d2b24', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d8ded9',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  ajuda: { fontSize: 13, color: '#6b7a72', marginBottom: 12 },
  botao: {
    backgroundColor: '#2f6f4e',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoDesativado: { backgroundColor: '#a9bfb3' },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
