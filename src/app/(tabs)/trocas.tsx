import { Feather } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BolinhasPeso,
  TopbarTrocas,
  formatarPrazoTroca,
  formatarTempoRestanteCiclo,
} from '@/components/trocas/TrocasUI';
import { AppIcon } from '@/components/ui/Icons';
import { colors } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { listarTrocasDoUsuario } from '@/services/trocas';
import { PropostaTroca, StatusTroca } from '@/types/troca';

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function CardPropostaRecebida({ proposta }: { proposta: PropostaTroca }) {
  const prazoTexto = formatarPrazoTroca(proposta.tarefaSolicitadaPrazo);
  const tempoRestante = formatarTempoRestanteCiclo(proposta.cicloFim);

  return (
    <View style={styles.card}>
      <View style={styles.cardTopMetaRow}>
        <View style={styles.blindBadge}>
          <AppIcon name="swap" size={13} color="#B45309" strokeWidth={2.3} />
          <Text style={styles.blindBadgeText}>Troca Cega Recebida</Text>
        </View>

        <View style={styles.clockRow}>
          <Feather name="clock" size={13} color="#DC2626" />
          <Text style={styles.clockText}>{tempoRestante}</Text>
        </View>
      </View>

      <Text style={styles.fieldEyebrow}>Querem te entregar:</Text>
      <Text style={styles.offeredTitle}>{proposta.tarefaOrigemNome}</Text>
      {Boolean(proposta.tarefaOrigemDescricao) && (
        <Text style={styles.offeredDesc} numberOfLines={2}>
          {proposta.tarefaOrigemDescricao}
        </Text>
      )}

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerSwapCircle}>
          <AppIcon name="swap" size={15} color={colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.fieldEyebrow}>Em troca da sua tarefa:</Text>
      <View style={styles.requestedTitleRow}>
        <Text style={styles.requestedTitle}>{proposta.tarefaSolicitadaNome}</Text>
        <BolinhasPeso peso={proposta.tarefaSolicitadaPeso} />
      </View>
      <Text style={styles.requestedSub}>
        {prazoTexto} • Peso {proposta.tarefaSolicitadaPeso}
      </Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.btnRecusar}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: '/recusar-troca',
              params: { id: proposta.id },
            })
          }
        >
          <Text style={styles.btnRecusarText}>Recusar troca</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnAceitar}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: '/confirmar-troca',
              params: { id: proposta.id },
            })
          }
        >
          <Text style={styles.btnAceitarText}>Aceitar troca</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatusTagEnviada({ status }: { status: StatusTroca }) {
  if (status === 'aceita') {
    return (
      <View style={[styles.statusTag, styles.statusTagAceita]}>
        <Text style={[styles.statusTagText, styles.statusTagTextAceita]}>Aceita</Text>
      </View>
    );
  }
  if (status === 'recusada') {
    return (
      <View style={[styles.statusTag, styles.statusTagRecusada]}>
        <Text style={[styles.statusTagText, styles.statusTagTextRecusada]}>Recusada</Text>
      </View>
    );
  }
  return (
    <View style={[styles.statusTag, styles.statusTagPendente]}>
      <Text style={[styles.statusTagText, styles.statusTagTextPendente]}>Pendente</Text>
    </View>
  );
}

function CardPropostaEnviada({ proposta }: { proposta: PropostaTroca }) {
  return (
    <View style={styles.card}>
      <View style={styles.sentHeaderRow}>
        <View>
          <Text style={styles.sentEyebrow}>PROPOSTA ENVIADA</Text>
          <Text style={styles.sentRecipient}>Para: Usuário oculto</Text>
        </View>
        <StatusTagEnviada status={proposta.status} />
      </View>

      <View style={styles.sentDivider} />

      <View style={styles.sentDetailRow}>
        <Text style={styles.sentLabel}>Você ofereceu:</Text>
        <Text style={styles.sentTaskDark} numberOfLines={2}>
          {proposta.tarefaOrigemNome}
        </Text>
      </View>

      <View style={styles.sentDetailRow}>
        <Feather name="arrow-right" size={14} color={colors.primary} style={styles.sentArrow} />
        <Text style={styles.sentLabel}>Você pediu:</Text>
        <Text style={styles.sentTaskBlue} numberOfLines={2}>
          {proposta.tarefaSolicitadaNome}
        </Text>
      </View>

      <View style={styles.sentWeightRow}>
        <Text style={styles.sentWeightLabel}>Peso de relevância</Text>
        <BolinhasPeso peso={proposta.tarefaSolicitadaPeso} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tela Principal
// ---------------------------------------------------------------------------

export default function TrocasScreen() {
  const insets = useSafeAreaInsets();
  const { width: larguraTela } = useWindowDimensions();
  const carrosselRef = useRef<ScrollView>(null);

  const { usuario, perfil, carregando: carregandoSessao } = useSessao();
  const [abaAtiva, setAbaAtiva] = useState<0 | 1>(0);
  const [recebidas, setRecebidas] = useState<PropostaTroca[]>([]);
  const [enviadas, setEnviadas] = useState<PropostaTroca[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [recarregando, setRecarregando] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!perfil) return;
    try {
      const dados = await listarTrocasDoUsuario(perfil.moradiaId, perfil.uid);
      setRecebidas(dados.recebidas);
      setEnviadas(dados.enviadas);
    } catch (e) {
      console.warn('Erro ao carregar trocas:', e);
    } finally {
      setCarregado(true);
    }
  }, [perfil]);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [carregarDados]),
  );

  const handleRefresh = async () => {
    setRecarregando(true);
    await carregarDados();
    setRecarregando(false);
  };

  const selecionarAba = (indice: 0 | 1) => {
    setAbaAtiva(indice);
    carrosselRef.current?.scrollTo({ x: indice * larguraTela, animated: true });
  };

  const aoFinalizarDeslize = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (larguraTela <= 0) return;
    const indice = Math.round(evento.nativeEvent.contentOffset.x / larguraTela);
    setAbaAtiva(indice >= 1 ? 1 : 0);
  };

  if (carregandoSessao) return <View style={styles.container} />;
  if (!usuario) return <Redirect href="/login" />;
  if (!perfil) return <Redirect href="/" />;

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerArea, { paddingTop: Math.max(48, insets.top + 10) }]}>
        <TopbarTrocas
          title="Trocas"
          onBack={voltar}
          onHelp={() =>
            Alert.alert(
              'Trocas Cegas',
              'Você pode propor trocar uma tarefa sua pendente por outra do ciclo atual. ' +
                'As identidades dos moradores permanecem ocultas em todas as etapas.',
            )
          }
        />

        {/* Widget divisor de carrossel */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, abaAtiva === 0 && styles.tabBtnActive]}
            activeOpacity={0.75}
            onPress={() => selecionarAba(0)}
          >
            <Text style={[styles.tabLabel, abaAtiva === 0 && styles.tabLabelActive]}>
              Propostas recebidas{recebidas.length > 0 ? ` (${recebidas.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, abaAtiva === 1 && styles.tabBtnActive]}
            activeOpacity={0.75}
            onPress={() => selecionarAba(1)}
          >
            <Text style={[styles.tabLabel, abaAtiva === 1 && styles.tabLabelActive]}>
              Propostas enviadas{enviadas.length > 0 ? ` (${enviadas.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Carrossel horizontal com deslize */}
      <ScrollView
        ref={carrosselRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={aoFinalizarDeslize}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {/* Página 1: Propostas recebidas */}
        <ScrollView
          style={{ width: larguraTela }}
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={recarregando}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.infoBanner}>
            <Feather name="info" size={18} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoBannerText}>
              Proposta pendente neste ciclo. As identidades ficam ocultas.
            </Text>
          </View>

          {!carregado ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : recebidas.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nenhuma proposta recebida</Text>
              <Text style={styles.emptySub}>
                Quando algum morador pedir para trocar uma tarefa com você neste ciclo, ela
                aparecerá aqui.
              </Text>
            </View>
          ) : (
            recebidas.map((item) => <CardPropostaRecebida key={item.id} proposta={item} />)
          )}
        </ScrollView>

        {/* Página 2: Propostas enviadas */}
        <ScrollView
          style={{ width: larguraTela }}
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={recarregando}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {!carregado ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : enviadas.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nenhuma proposta enviada</Text>
              <Text style={styles.emptySub}>
                Precisa reorganizar suas tarefas da semana? Toque em Nova proposta de troca abaixo.
              </Text>
            </View>
          ) : (
            enviadas.map((item) => <CardPropostaEnviada key={item.id} proposta={item} />)
          )}
        </ScrollView>
      </ScrollView>

      {/* Botão flutuante acima da BottomNavBar */}
      <View
        style={[
          styles.ctaWrapper,
          { bottom: Math.max(102, insets.bottom + 88) },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/nova-proposta')}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.ctaBtnText}>Nova proposta de troca</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerArea: {
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontFamily: 'Sora-Bold',
    fontSize: 13,
    color: '#7B8BA3',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.primary,
  },

  carousel: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 180,
  },
  loader: {
    marginTop: 32,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F1FE',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D6E4FC',
    gap: 10,
  },
  infoIcon: {
    flexShrink: 0,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textDark,
  },

  // Card comum
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EBF0F6',
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  blindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7DB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  blindBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#92400E',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#DC2626',
  },

  fieldEyebrow: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#7B8BA3',
    marginBottom: 4,
  },
  offeredTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 19,
    color: colors.textDark,
    marginBottom: 4,
  },
  offeredDesc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: '#7B8BA3',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEF2F7',
  },
  dividerSwapCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DCE8FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },

  requestedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  requestedTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 17.5,
    color: colors.primary,
  },
  requestedSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#7B8BA3',
    marginBottom: 16,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnRecusar: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#DCE3EE',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRecusarText: {
    fontFamily: 'Sora-Bold',
    fontSize: 14,
    color: '#64748B',
  },
  btnAceitar: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAceitarText: {
    fontFamily: 'Sora-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Propostas enviadas
  sentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sentEyebrow: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    letterSpacing: 0.7,
    color: '#8A98AC',
    marginBottom: 3,
  },
  sentRecipient: {
    fontFamily: 'Sora-Bold',
    fontSize: 16.5,
    color: colors.textDark,
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusTagPendente: {
    backgroundColor: colors.amberBg,
  },
  statusTagAceita: {
    backgroundColor: colors.greenBg,
  },
  statusTagRecusada: {
    backgroundColor: colors.coralBg,
  },
  statusTagText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
  statusTagTextPendente: {
    color: colors.amberFg,
  },
  statusTagTextAceita: {
    color: colors.greenFg,
  },
  statusTagTextRecusada: {
    color: colors.coralFg,
  },
  sentDivider: {
    height: 1,
    backgroundColor: '#EEF2F7',
    marginVertical: 14,
  },
  sentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  sentArrow: {
    marginRight: 2,
  },
  sentLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#7B8BA3',
  },
  sentTaskDark: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14.5,
    color: colors.textDark,
    flexShrink: 1,
  },
  sentTaskBlue: {
    fontFamily: 'Sora-Bold',
    fontSize: 14.5,
    color: colors.primary,
    flexShrink: 1,
  },
  sentWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sentWeightLabel: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12.5,
    color: '#7B8BA3',
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBF0F6',
  },
  emptyTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 16,
    color: colors.textDark,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: '#7B8BA3',
    textAlign: 'center',
  },

  // CTA fixo
  ctaWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  ctaBtn: {
    width: '100%',
    maxWidth: 420,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaBtnText: {
    fontFamily: 'Sora-Bold',
    fontSize: 15.5,
    color: '#FFFFFF',
  },
});
