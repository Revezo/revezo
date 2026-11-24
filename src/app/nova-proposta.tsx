import { Feather } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BolinhasPeso,
  TopbarTrocas,
  formatarPrazoSeletor,
} from '@/components/trocas/TrocasUI';
import { colors } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import {
  buscarTarefasElegiveisParaTroca,
  criarPropostaTroca,
  TarefasElegiveisTroca,
} from '@/services/trocas';
import { InstanciaTarefa } from '@/types/ciclo';

type CampoModal = 'propria' | 'outra' | null;

function formatarResumoTarefa(tarefa: InstanciaTarefa): string {
  const prazo = formatarPrazoSeletor(tarefa.prazoFim);
  return `${tarefa.tarefaNome} (${prazo}, Peso ${tarefa.tarefaPeso})`;
}

export default function NovaPropostaScreen() {
  const insets = useSafeAreaInsets();
  const { usuario, perfil, carregando: carregandoSessao } = useSessao();

  const [elegiveis, setElegiveis] = useState<TarefasElegiveisTroca | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [tarefaPropria, setTarefaPropria] = useState<InstanciaTarefa | null>(null);
  const [tarefaDesejada, setTarefaDesejada] = useState<InstanciaTarefa | null>(null);

  const [modalCampo, setModalCampo] = useState<CampoModal>(null);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    if (!perfil) return;
    setCarregandoDados(true);
    try {
      const res = await buscarTarefasElegiveisParaTroca(perfil.moradiaId, perfil.uid);
      setElegiveis(res);
    } catch (e) {
      console.warn('Erro ao carregar tarefas elegíveis para troca:', e);
    } finally {
      setCarregandoDados(false);
    }
  }, [perfil]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const listaModal = useMemo(() => {
    if (!elegiveis || !modalCampo) return [];
    const base =
      modalCampo === 'propria' ? elegiveis.minhasPendentes : elegiveis.outrasPendentes;
    const termo = busca.trim().toLowerCase();
    if (!termo) return base;
    return base.filter((t) => t.tarefaNome.toLowerCase().includes(termo));
  }, [elegiveis, modalCampo, busca]);

  if (carregandoSessao) return <View style={styles.container} />;
  if (!usuario) return <Redirect href="/login" />;
  if (!perfil) return <Redirect href="/" />;

  const abrirSeletor = (campo: 'propria' | 'outra') => {
    setBusca('');
    setModalCampo(campo);
  };

  const selecionarItem = (item: InstanciaTarefa) => {
    if (modalCampo === 'propria') {
      setTarefaPropria(item);
    } else if (modalCampo === 'outra') {
      setTarefaDesejada(item);
    }
    setModalCampo(null);
  };

  const enviar = async () => {
    if (!elegiveis || !tarefaPropria || !tarefaDesejada || enviando) return;
    setEnviando(true);
    try {
      await criarPropostaTroca({
        moradiaId: perfil.moradiaId,
        cicloId: elegiveis.cicloId,
        cicloFim: elegiveis.cicloFim,
        proponenteId: perfil.uid,
        proponenteNome: perfil.apelido || perfil.nome,
        instanciaOrigem: tarefaPropria,
        instanciaSolicitada: tarefaDesejada,
      });

      router.replace({
        pathname: '/proposta-enviada',
        params: {
          origemNome: tarefaPropria.tarefaNome,
          solicitadaNome: tarefaDesejada.tarefaNome,
        },
      });
    } catch (erro: any) {
      Alert.alert(
        'Não foi possível enviar',
        erro?.message || 'Verifique as tarefas escolhidas e tente novamente.',
      );
    } finally {
      setEnviando(false);
    }
  };

  const podeEnviar = Boolean(elegiveis && tarefaPropria && tarefaDesejada && !enviando);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(48, insets.top + 10) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TopbarTrocas
          title="Nova Proposta"
          onBack={() => (router.canGoBack() ? router.back() : router.dismissTo('/trocas'))}
        />

        <Text style={styles.heading}>Criar Proposta de Troca</Text>

        {carregandoDados ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            {/* Campo 1: Tarefa própria */}
            <Text style={styles.fieldLabel}>SUA TAREFA PARA OFERECER</Text>
            <TouchableOpacity
              style={styles.selectCard}
              activeOpacity={0.75}
              onPress={() => abrirSeletor('propria')}
            >
              <Text
                style={[styles.selectText, !tarefaPropria && styles.selectPlaceholder]}
                numberOfLines={1}
              >
                {tarefaPropria
                  ? formatarResumoTarefa(tarefaPropria)
                  : 'Selecione uma tarefa sua pendente'}
              </Text>
              <Feather name="chevron-down" size={18} color="#7B8BA3" />
            </TouchableOpacity>

            {/* Campo 2: Tarefa do outro morador */}
            <Text style={styles.fieldLabel}>TAREFA DESEJADA EM TROCA</Text>
            <TouchableOpacity
              style={styles.selectCard}
              activeOpacity={0.75}
              onPress={() => abrirSeletor('outra')}
            >
              <Text
                style={[styles.selectText, !tarefaDesejada && styles.selectPlaceholder]}
                numberOfLines={1}
              >
                {tarefaDesejada
                  ? formatarResumoTarefa(tarefaDesejada)
                  : 'Selecione a tarefa desejada'}
              </Text>
              <Feather name="chevron-down" size={18} color="#7B8BA3" />
            </TouchableOpacity>

            {/* Campo 3: Responsável oculto */}
            <Text style={styles.fieldLabel}>RESPONSÁVEL PELA TAREFA</Text>
            <View style={styles.readonlyCard}>
              <Text style={styles.selectText}>Usuário oculto</Text>
            </View>

            {/* Anonimato garantido */}
            <Text style={styles.fieldLabel}>ANONIMATO GARANTIDO</Text>
            <View style={styles.anonymityCard}>
              <Text style={styles.anonymityText}>
                Esta proposta será enviada ao responsável oculto da tarefa desejada.{'\n'}
                As identidades permanecem ocultas em todas as etapas do fluxo.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, !podeEnviar && styles.submitBtnDisabled]}
              activeOpacity={0.85}
              disabled={!podeEnviar}
              onPress={enviar}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Enviar Proposta</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Modal de seleção com pesquisa */}
      <Modal
        visible={modalCampo !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setModalCampo(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalCampo === 'propria'
                  ? 'Escolha sua tarefa pendente'
                  : 'Escolha a tarefa desejada'}
              </Text>
              <TouchableOpacity onPress={() => setModalCampo(null)} hitSlop={10}>
                <Feather name="x" size={22} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Feather name="search" size={17} color="#8A98AC" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar tarefa..."
                placeholderTextColor="#8A98AC"
                value={busca}
                onChangeText={setBusca}
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={listaModal}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>
                    {modalCampo === 'propria'
                      ? 'Você não possui tarefas pendentes neste ciclo.'
                      : 'Nenhuma tarefa pendente de outros moradores neste ciclo.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const selecionada =
                  modalCampo === 'propria'
                    ? tarefaPropria?.id === item.id
                    : tarefaDesejada?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.modalOption, selecionada && styles.modalOptionSelected]}
                    activeOpacity={0.75}
                    onPress={() => selecionarItem(item)}
                  >
                    <View style={styles.modalOptionInfo}>
                      <Text style={styles.modalOptionTitle}>{item.tarefaNome}</Text>
                      <Text style={styles.modalOptionSub}>
                        {formatarPrazoSeletor(item.prazoFim)} • Peso {item.tarefaPeso}
                      </Text>
                    </View>
                    <BolinhasPeso peso={item.tarefaPeso} />
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
  heading: {
    fontFamily: 'Sora-ExtraBold',
    fontSize: 22,
    color: colors.textDark,
    marginBottom: 22,
  },
  loader: {
    marginTop: 40,
  },
  fieldLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    letterSpacing: 0.7,
    color: '#8A98AC',
    marginBottom: 8,
    marginTop: 6,
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    height: 54,
    marginBottom: 14,
    gap: 10,
  },
  readonlyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    height: 54,
    justifyContent: 'center',
    marginBottom: 14,
  },
  selectText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 15,
    color: colors.textDark,
    flex: 1,
  },
  selectPlaceholder: {
    color: '#8A98AC',
  },
  anonymityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 24,
  },
  anonymityText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textDark,
  },
  submitBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: 'Sora-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 51, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '78%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 17,
    color: colors.textDark,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14.5,
    color: colors.textDark,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBF0F6',
    marginBottom: 10,
    gap: 10,
  },
  modalOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  modalOptionInfo: {
    flex: 1,
  },
  modalOptionTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 15,
    color: colors.textDark,
    marginBottom: 3,
  },
  modalOptionSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12.5,
    color: '#7B8BA3',
  },
  modalEmpty: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#7B8BA3',
    textAlign: 'center',
  },
});
