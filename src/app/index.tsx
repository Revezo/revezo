import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { Redirect } from 'expo-router';

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [nomeTarefa, setNomeTarefa] = useState('');
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) carregarTarefas();
  }, [user]);

  const carregarTarefas = async () => {
    if (!user) return;
    const q = query(collection(db, 'tarefas'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    setTarefas(lista);
  };

  const adicionarTarefa = async () => {
    if (!nomeTarefa.trim()) return;
    try {
      await addDoc(collection(db, 'tarefas'), {
        nome: nomeTarefa,
        userId: user?.uid,
        criadaEm: new Date(),
        status: 'pendente',
      });
      setNomeTarefa('');
      setAdicionando(false);
      carregarTarefas();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const excluirTarefa = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tarefas', id));
      carregarTarefas();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Minhas Tarefas</Text>
        <Button title="Sair" onPress={() => signOut(auth)} color="red" />
      </View>

      <FlatList
        data={tarefas}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhuma tarefa ainda.</Text>}
        renderItem={({ item }) => (
          <View style={styles.tarefaItem}>
            <Text style={styles.tarefaNome}>{item.nome}</Text>
            <TouchableOpacity onPress={() => excluirTarefa(item.id)}>
              <Text style={styles.excluir}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {adicionando ? (
        <View style={styles.form}>
          <TextInput
            placeholder="Nome da tarefa"
            value={nomeTarefa}
            onChangeText={setNomeTarefa}
            style={styles.input}
          />
          <Button title="Salvar" onPress={adicionarTarefa} />
          <View style={{ marginVertical: 4 }} />
          <Button title="Cancelar" onPress={() => setAdicionando(false)} color="gray" />
        </View>
      ) : (
        <Button title="+ Nova Tarefa" onPress={() => setAdicionando(true)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
  tarefaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 8 },
  tarefaNome: { fontSize: 16, flex: 1 },
  excluir: { color: 'red', fontWeight: 'bold', marginLeft: 12 },
  vazio: { textAlign: 'center', color: '#999', marginTop: 32 },
  form: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 8 },
});