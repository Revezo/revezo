import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardComparacaoTroca, TopbarTrocas } from '@/components/trocas/TrocasUI';
import { colors } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { buscarTrocaPorId, recusarTroca } from '@/services/trocas';
import { MOTIVOS_RECUSA_NEUTROS, PropostaTroca } from '@/types/troca';

export default function RecusarTrocaScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { usuario, perfil, carregando: carregandoSessao } = useSessao();

  const [proposta, setProposta] = useState<PropostaTroca | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>(MOTIVOS_RECUSA_NEUTROS[0]);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        if (id) {
          const item = await buscarTrocaPorId(id);
          if (ativo) setProposta(item);
        }
      } catch (e) {
        console.warn('Erro ao carregar proposta:', e);
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    carregar();
    return () => {
      ativo = false;
    };
  }, [id]);

  if (carregandoSessao) return <View style={styles.container} />;
  if (!usuario) return <Redirect href="/login" />;
  if (!perfil) return <Redirect href="/" />;

  const voltar = () => {
    if (router.canGoBack()) router.back();
    else router.dismissTo('/trocas');
  };

  const confirmarRecusa = async () => {
    if (!proposta || enviando) return;
    setEnviando(true);
    try {
      await recusarTroca(proposta.id, perfil.uid, motivoSelecionado);
      router.dismissTo('/trocas');
    } catch (erro: any) {
      Alert.alert(
        'Não foi possível recusar',
        erro?.message || 'Ocorreu um erro ao recusar a proposta.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(48, insets.top + 10) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TopbarTrocas title="Recusar Troca" onBack={voltar} />

        <Text style={styles.heading}>Recusar proposta recebida?</Text>

        {carregando ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : !proposta ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Proposta não encontrada.</Text>
          </View>
        ) : (
          <>
            <CardComparacaoTroca
              labelTopo="TAREFA OFERECIDA"
              tituloTopo={proposta.tarefaOrigemNome}
              subtituloTopo="Você assumirá essa responsabilidade no ciclo atual."
              labelBaixo="SUA TAREFA ATUAL (A SER ENTREGUE)"
              tituloBaixo={proposta.tarefaSolicitadaNome}
              subtituloBaixo="Sua antiga obrigação será transferida."
              pesoBaixo={proposta.tarefaSolicitadaPeso}
            />

            <View style={styles.reasonHeaderRow}>
              <Text style={styles.reasonHeaderLeft}>MOTIVO DA RECUSA (OPCIONAL)</Text>
              <Text style={styles.reasonHeaderRight}>ANONIMATO PRESERVADO</Text>
            </View>

            <View style={styles.reasonCard}>
              <Text style={styles.reasonCardSubtitle}>Escolha um motivo neutro</Text>

              {MOTIVOS_RECUSA_NEUTROS.map((motivo) => {
                const selecionado = motivoSelecionado === motivo;
                return (
                  <TouchableOpacity
                    key={motivo}
                    style={styles.radioRow}
                    activeOpacity={0.75}
                    onPress={() => setMotivoSelecionado(motivo)}
                  >
                    <View style={[styles.radioOuter, selecionado && styles.radioOuterSelected]}>
                      {selecionado && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{motivo}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.declineBtn, enviando && styles.btnDisabled]}
              activeOpacity={0.85}
              disabled={enviando}
              onPress={confirmarRecusa}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.declineBtnText}>Confirmar Recusa</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.8}
              disabled={enviando}
              onPress={voltar}
            >
              <Text style={styles.cancelBtnText}>Voltar</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
    marginBottom: 20,
  },
  loader: {
    marginTop: 40,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBF0F6',
  },
  emptyText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14.5,
    color: '#7B8BA3',
  },
  reasonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  reasonHeaderLeft: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    letterSpacing: 0.6,
    color: '#8A98AC',
  },
  reasonHeaderRight: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.primary,
  },
  reasonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EBF0F6',
    marginBottom: 24,
  },
  reasonCardSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13.5,
    color: '#7B8BA3',
    marginBottom: 14,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    flex: 1,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14.5,
    color: colors.textDark,
  },
  declineBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#C81E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#C81E1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  declineBtnText: {
    fontFamily: 'Sora-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  cancelBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Sora-Bold',
    fontSize: 15.5,
    color: '#7B8BA3',
  },
});
