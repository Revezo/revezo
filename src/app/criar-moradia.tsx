import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/theme';
import { auth } from '@/firebaseConfig';
import { criarMoradiaComoAdmin } from '@/services/moradia';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CriarMoradiaScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [apelido, setApelido] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleCriarMoradia() {
    if (!nome || !apelido) {
      Alert.alert('Atenção', 'Nome da moradia e seu apelido são obrigatórios!');
      return;
    }

    const usuarioAtual = auth.currentUser;
    if (!usuarioAtual) {
      Alert.alert('Erro', 'Você precisa estar logado para criar uma moradia.');
      return;
    }

    setCarregando(true);
    try {
      const resposta = await criarMoradiaComoAdmin(usuarioAtual, nome, endereco, apelido);
      
      router.push({
        pathname: '/codigo-convite',
        params: { codigo: resposta.codigoConvite }
      });
      
    } catch (erro: any) {
      Alert.alert('Erro', erro.message || 'Não foi possível criar a moradia. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Header title="Criar Moradia" />
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.form}>
          <Input
            label="NOME DA MORADIA"
            placeholder="Ex: Apartamento 302"
            value={nome}
            onChangeText={setNome}
          />

          <Input
            label="ENDEREÇO (OPCIONAL)"
            placeholder="Rua, número, bairro"
            value={endereco}
            onChangeText={setEndereco}
          />

          <Input
            label="SEU APELIDO NA MORADIA"
            placeholder="Como quer ser chamado?"
            value={apelido}
            onChangeText={setApelido}
          />

          <Text style={styles.hint}>
            ℹ️ Você será o administrador desta moradia e poderá convidar outros moradores.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title={carregando ? "Criando..." : "Criar Moradia"} 
          onPress={handleCriarMoradia} 
          disabled={carregando}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 100 },
  form: { marginTop: 24, gap: 16 },
  hint: { color: colors.textGray, fontSize: 13, marginTop: 8, lineHeight: 18 },
  footer: { padding: 24, paddingBottom: 32 },
});