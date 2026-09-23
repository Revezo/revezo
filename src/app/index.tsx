import { colors } from '@/constants/theme';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../firebaseConfig';
import {
  PerfilUsuario,
  carregarPerfil,
  criarMoradiaComoAdmin,
  ehAdministrador,
} from '../services/moradia';
import { excluirTarefa, listarTarefas } from '../services/tarefas';
import {
  ROTULOS_PESO,
  Tarefa,
  descreverFrequencia,
  descreverJanela,
  descreverPrazo,
  formatarDataHora,
  proximoSorteio,
} from '../types/tarefa';

export default function HomeScreen() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [nomeMoradia, setNomeMoradia] = useState('');
  const [criandoMoradia, setCriandoMoradia] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (atual) => {
        setUsuario(atual);
        if (atual) {
          try {
            setPerfil(await carregarPerfil(atual));
          } catch {
            setPerfil(null);
          }
        } else {
          setPerfil(null);
          setTarefas([]);
        }
        setCarregando(false);
      }),
    [],
  );

  const atualizarLista = useCallback(async () => {
    if (!perfil) return;
    try {
      setTarefas(await listarTarefas(perfil.moradiaId));
    } catch (erro: any) {
      Alert.alert('Erro ao carregar tarefas', erro.message);
    }
  }, [perfil]);

  useFocusEffect(
    useCallback(() => {
      atualizarLista();
    }, [atualizarLista]),
  );

  const criarMoradia = async () => {
    if (!usuario) return;
    setCriandoMoradia(true);
    try {
      setPerfil(await criarMoradiaComoAdmin(usuario, nomeMoradia));
      setNomeMoradia('');
    } catch (erro: any) {
      Alert.alert('Não foi possível criar a moradia', erro.message);
    } finally {
      setCriandoMoradia(false);
    }
  };

  const excluir = async (tarefa: Tarefa) => {
    setErroExclusao(null);
    setExcluindoId(tarefa.id);
    try {
      await excluirTarefa(perfil, tarefa.id);
      setConfirmandoId(null);
      await atualizarLista();
    } catch (erro: any) {
      setErroExclusao(erro.message ?? 'Não foi possível excluir a tarefa.');
    } finally {
      setExcluindoId(null);
    }
  };

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color="#2f6f4e" />
      </View>
    );
  }

  if (!usuario) return <Redirect href="/login" />;

  if (!perfil) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cartao}>
          <Text style={styles.cartaoTitulo}>Crie sua moradia</Text>
          <Text style={styles.cartaoTexto}>
            As tarefas pertencem a uma moradia. Quem cria a moradia vira administrador e pode
            cadastrar tarefas.
          </Text>
          <TextInput
            placeholder="Nome da moradia"
            value={nomeMoradia}
            onChangeText={setNomeMoradia}
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.botao, criandoMoradia && styles.botaoDesativado]}
            onPress={criarMoradia}
            disabled={criandoMoradia}
          >
            <Text style={styles.botaoTexto}>
              {criandoMoradia ? 'Criando...' : 'Criar moradia'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sair} onPress={() => signOut(auth)}>
            <Text style={styles.sairTexto}>Sair</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const admin = ehAdministrador(perfil);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>{perfil.moradiaNome}</Text>
          <Text style={styles.subtitulo}>
            {admin ? 'Administrador' : 'Morador'} · Próximo sorteio em{' '}
            {formatarDataHora(proximoSorteio())}
          </Text>
        </View>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Text style={styles.sairTexto}>Sair</Text>
        </TouchableOpacity>
      </View>

      {erroExclusao && (
        <View style={styles.faixaErro}>
          <Text style={styles.faixaErroTexto}>{erroExclusao}</Text>
          <TouchableOpacity onPress={() => setErroExclusao(null)}>
            <Text style={styles.faixaErroFechar}>Fechar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={tarefas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vazio}>
            {admin
              ? 'Nenhuma tarefa cadastrada. Comece criando a primeira.'
              : 'A moradia ainda não tem tarefas cadastradas.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.tarefa}>
            <View style={styles.tarefaTopo}>
              <Text style={styles.tarefaNome}>{item.nome}</Text>
              <View style={styles.peso}>
                <Text style={styles.pesoTexto}>{item.pesoDificuldade}</Text>
              </View>
            </View>
            <Text style={styles.tarefaDetalhe}>{descreverFrequencia(item.frequencia)}</Text>
            <Text style={styles.tarefaDetalhe}>
              {ROTULOS_PESO[item.pesoDificuldade]} · {descreverPrazo(item.prazoConclusaoDias)}
            </Text>
            <Text style={styles.tarefaDetalhe}>
              {descreverJanela(item.janelaAntecedenciaHoras)}
            </Text>
            {item.proximoSorteioElegivel && (
              <Text style={styles.tarefaSorteio}>
                No sorteio de {formatarDataHora(item.proximoSorteioElegivel)}
              </Text>
            )}
            {admin && confirmandoId === item.id && (
              <View style={styles.confirmacao}>
                <Text style={styles.confirmacaoTexto}>Remover dos próximos sorteios?</Text>
                <View style={styles.confirmacaoBotoes}>
                  <TouchableOpacity
                    style={styles.confirmacaoBotao}
                    onPress={() => setConfirmandoId(null)}
                    disabled={excluindoId === item.id}
                  >
                    <Text style={styles.manter}>Manter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmacaoBotao}
                    onPress={() => excluir(item)}
                    disabled={excluindoId === item.id}
                  >
                    <Text style={styles.confirmarExclusaoTexto}>
                      {excluindoId === item.id ? 'Excluindo...' : 'Confirmar exclusão'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {admin && confirmandoId !== item.id && (
              <TouchableOpacity onPress={() => setConfirmandoId(item.id)}>
                <Text style={styles.excluir}>Excluir</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {admin ? (
        <TouchableOpacity style={styles.botao} onPress={() => router.push('/nova-tarefa')}>
          <Text style={styles.botaoTexto}>Cadastrar tarefa</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.rodapeAviso}>
          Só administradores da moradia cadastram tarefas.
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  cabecalho: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 22, fontWeight: '700', color: colors.textDark },
  subtitulo: { fontSize: 13, color: colors.textGray, marginTop: 2 },
  lista: { paddingBottom: 16 },
  tarefa: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 16, marginBottom: 10 },
  tarefaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tarefaNome: { fontSize: 16, fontWeight: '600', color: colors.textDark, flex: 1, paddingRight: 12 },
  peso: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pesoTexto: { color: colors.textDark, fontWeight: '700', fontSize: 13 },
  tarefaDetalhe: { fontSize: 13, color: colors.textGray, marginTop: 6 },
  tarefaSorteio: { fontSize: 13, color: colors.primary, marginTop: 8, fontWeight: '600' },
  excluir: { color: '#EF4444', fontSize: 13, marginTop: 12, fontWeight: '600' },
  confirmacao: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.stroke,
  },
  confirmacaoTexto: { fontSize: 13, color: colors.textDark, marginBottom: 8 },
  confirmacaoBotoes: { flexDirection: 'row', alignItems: 'center' },
  confirmacaoBotao: { marginRight: 20 },
  manter: { color: colors.textGray, fontSize: 13, fontWeight: '600' },
  confirmarExclusaoTexto: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  faixaErro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  faixaErroTexto: { color: '#EF4444', fontSize: 13, flex: 1, paddingRight: 12 },
  faixaErroFechar: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  vazio: { textAlign: 'center', color: colors.textGray, marginTop: 40, lineHeight: 20 },
  cartao: { backgroundColor: colors.inputBackground, borderRadius: 12, padding: 20 },
  cartaoTitulo: { fontSize: 18, fontWeight: '700', color: colors.textDark },
  cartaoTexto: { fontSize: 14, color: colors.textGray, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: colors.inputBackground,
  },
  botao: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  botaoDesativado: { backgroundColor: colors.textGray },
  botaoTexto: { color: colors.textWhite, fontSize: 16, fontWeight: '600' },
  sair: { marginTop: 16, alignItems: 'center' },
  sairTexto: { color: '#EF4444', fontSize: 15 },
  rodapeAviso: { textAlign: 'center', color: colors.textGray, fontSize: 13, paddingVertical: 12 },
});