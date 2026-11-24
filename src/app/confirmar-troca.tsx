import { Feather } from '@expo/vector-icons';
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
import { aceitarTroca, buscarTrocaPorId } from '@/services/trocas';
import { PropostaTroca } from '@/types/troca';

export default function ConfirmarTrocaScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { usuario, perfil, carregando: carregandoSessao } = useSessao();

  const [proposta, setProposta] = useState<PropostaTroca | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

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

  const confirmar = async () => {
    if (!proposta || enviando) return;
    setEnviando(true);
    try {
      await aceitarTroca(proposta.id, perfil.uid);
      router.replace({
        pathname: '/troca-confirmada',
        params: {
          novaTarefa: proposta.tarefaOrigemNome,
          tarefaTransferida: proposta.tarefaSolicitadaNome,
        },
      });
    } catch (erro: any) {
      Alert.alert(
        'Não foi possível aceitar',
        erro?.message || 'Ocorreu um erro ao confirmar a troca.',
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
        <TopbarTrocas title="Confirmar Troca" onBack={voltar} />

        <Text style={styles.heading}>Deseja aceitar esta troca?</Text>

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

            <View style={styles.shieldBanner}>
              <Feather name="shield" size={18} color={colors.primary} style={styles.shieldIcon} />
              <Text style={styles.shieldText}>
                As identidades permanecem ocultas. Ao confirmar, você assume a tarefa oferecida e
                entrega a sua. A troca não poderá ser desfeita.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, enviando && styles.btnDisabled]}
              activeOpacity={0.85}
              disabled={enviando}
              onPress={confirmar}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirmar Troca</Text>
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
  shieldBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F1FE',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D6E4FC',
    gap: 12,
    marginBottom: 26,
  },
  shieldIcon: {
    marginTop: 2,
  },
  shieldText: {
    flex: 1,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textDark,
  },
  confirmBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
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
