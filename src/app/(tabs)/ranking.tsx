import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { carregarRankingMoradia, DadosRanking, MoradorRanking } from '@/services/ranking';

// ---------------------------------------------------------------------------
// Componentes Visuais
// ---------------------------------------------------------------------------

function AvatarMorador({
  nome,
  fotoUrl,
  tamanho = 44,
  fontSize = 16,
}: {
  nome: string;
  fotoUrl?: string;
  tamanho?: number;
  fontSize?: number;
}) {
  const inicial = nome.trim().charAt(0).toUpperCase() || 'M';
  const raio = tamanho / 2;

  if (fotoUrl) {
    return (
      <Image
        source={{ uri: fotoUrl }}
        style={{ width: tamanho, height: tamanho, borderRadius: raio }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <LinearGradient
      colors={['#8FD0FF', '#2B7FFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.avatarFallback,
        { width: tamanho, height: tamanho, borderRadius: raio },
      ]}
    >
      <Text style={[styles.avatarFallbackText, { fontSize }]}>{inicial}</Text>
    </LinearGradient>
  );
}

const MEDALHA_POR_POSICAO: Record<
  number,
  { fundo: string; fita: string; disco: string; borda: string; texto: string }
> = {
  1: {
    fundo: '#FEF3C7',
    fita: '#E11D48',
    disco: '#FACC15',
    borda: '#CA8A04',
    texto: '#78350F',
  },
  2: {
    fundo: '#F1F5F9',
    fita: '#2563EB',
    disco: '#CBD5E1',
    borda: '#64748B',
    texto: '#1E293B',
  },
  3: {
    fundo: '#FFEDD5',
    fita: '#EA580C',
    disco: '#D97706',
    borda: '#92400E',
    texto: '#FFFFFF',
  },
};

function MedalhaPodio({ posicao }: { posicao: number }) {
  const cfg = MEDALHA_POR_POSICAO[posicao];

  if (cfg) {
    return (
      <View style={[styles.medalhaCirculo, { backgroundColor: cfg.fundo }]}>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <Path d="M8 1.5h3.2l1 6H9L8 1.5z" fill={cfg.fita} />
          <Path d="M16 1.5h-3.2l-1 6H15l1-6z" fill={cfg.fita} />
          <Circle cx="12" cy="14.5" r="8" fill={cfg.disco} stroke={cfg.borda} strokeWidth="1.5" />
        </Svg>
        <View style={styles.medalhaNumeroContainer} pointerEvents="none">
          <Text style={[styles.medalhaNumeroSobreposto, { color: cfg.texto }]}>
            {posicao}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.medalhaCirculo}>
      <Text style={styles.posicaoNumero}>{posicao}</Text>
    </View>
  );
}

function CardMoradorRanking({
  morador,
  ehUsuarioLogado,
  maxPontos,
}: {
  morador: MoradorRanking;
  ehUsuarioLogado: boolean;
  maxPontos: number;
}) {
  const corPontos =
    morador.posicao === 1
      ? '#D97706'
      : ehUsuarioLogado
        ? '#2B7FFF'
        : morador.posicao === 3
          ? '#B45309'
          : '#64748B';

  const larguraBarra = maxPontos > 0 ? Math.max(4, Math.round((morador.pontos / maxPontos) * 100)) : 0;

  return (
    <View style={[styles.rankCard, ehUsuarioLogado && styles.rankCardLogado]}>
      <MedalhaPodio posicao={morador.posicao} />

      <AvatarMorador nome={morador.nome} fotoUrl={morador.fotoUrl} tamanho={44} fontSize={16} />

      <View style={styles.rankInfo}>
        <View style={styles.rankNomeRow}>
          <Text style={styles.rankNome} numberOfLines={1}>
            {morador.nome}
          </Text>
          {ehUsuarioLogado && (
            <View style={styles.voceBadge}>
              <Text style={styles.voceBadgeText}>VOCÊ</Text>
            </View>
          )}
        </View>

        <View style={styles.rankPontosRow}>
          <Text style={[styles.rankPontos, { color: corPontos }]}>
            {morador.pontos} {morador.pontos === 1 ? 'ponto' : 'pontos'}
          </Text>

          <View style={styles.rankBarTrack}>
            {larguraBarra > 0 && (
              <View
                style={[
                  styles.rankBarFill,
                  { width: `${larguraBarra}%`, backgroundColor: corPontos },
                ]}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tela Principal
// ---------------------------------------------------------------------------

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const { usuario, perfil, carregando: carregandoSessao } = useSessao();

  const [dados, setDados] = useState<DadosRanking | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [recarregando, setRecarregando] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!perfil) return;
    try {
      const resultado = await carregarRankingMoradia(perfil.moradiaId, perfil.uid);
      setDados(resultado);
    } catch (e) {
      console.warn('Erro ao carregar ranking:', e);
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

  if (carregandoSessao) return <View style={styles.container} />;
  if (!usuario) return <Redirect href="/login" />;
  if (!perfil) return <Redirect href="/" />;

  const usuarioAtual = dados?.usuarioAtual;
  const moradores = dados?.moradores ?? [];
  const maxPontos = dados?.maxPontos ?? 0;
  const meusPontos = usuarioAtual?.pontos ?? 0;
  const minhaPosicao = usuarioAtual?.posicao ?? 1;
  const meuProgresso = usuarioAtual?.progressoCicloAtualPercent ?? 0;
  const meuStreak = usuarioAtual?.streak ?? 0;
  const nomeExibicao = usuarioAtual?.nome || perfil.apelido || perfil.nome;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(48, insets.top + 10) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={recarregando}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Topbar */}
        <View style={styles.topbar}>
          <View style={styles.topbarSpacer} />
          <Text style={styles.screenTitle}>Ranking</Text>
          <TouchableOpacity
            style={styles.helpBtn}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Pontuação e Ranking',
                'Sempre que você conclui uma tarefa, o peso dela é somado aos seus pontos acumulados. ' +
                  'O pódio compara sua pontuação com a dos demais moradores.',
              )
            }
            accessibilityLabel="Ajuda sobre o Ranking"
          >
            <Feather name="help-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {!carregado ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            {/* Card Resumo do Usuário Logado */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeaderRow}>
                <AvatarMorador
                  nome={nomeExibicao}
                  fotoUrl={usuarioAtual?.fotoUrl}
                  tamanho={54}
                  fontSize={20}
                />

                <View style={styles.heroUserInfo}>
                  <Text style={styles.heroUserName} numberOfLines={1}>
                    {nomeExibicao}
                  </Text>
                  <Text style={styles.heroStreak}>
                    🔥 {meuStreak} {meuStreak === 1 ? 'ciclo consecutivo' : 'ciclos consecutivos'}
                  </Text>
                </View>

                <View style={styles.lugarPill}>
                  <Text style={styles.lugarPillText}>#{minhaPosicao}º Lugar</Text>
                </View>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroStatsRow}>
                <View style={styles.heroPointsCol}>
                  <Text style={styles.heroPointsLabel}>PONTOS ACUMULADOS</Text>
                  <Text style={styles.heroPointsValue}>
                    {meusPontos} {meusPontos === 1 ? 'ponto' : 'pontos'}
                  </Text>
                </View>

                <View style={styles.heroProgressCol}>
                  <View style={styles.heroProgressTextRow}>
                    <Text style={styles.heroProgressLabel}>Progresso</Text>
                    <Text style={styles.heroProgressPercent}>{meuProgresso}%</Text>
                  </View>
                  <View style={styles.heroProgressTrack}>
                    <View
                      style={[
                        styles.heroProgressFill,
                        { width: `${Math.min(100, Math.max(0, meuProgresso))}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Cabeçalho da Lista */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>RANKING DA MORADIA</Text>
              <Text style={styles.sectionSubtitle}>
                {dados?.rotuloCicloAtual || 'Ciclo atual'}
              </Text>
            </View>

            {/* Lista de Moradores no Pódio */}
            {moradores.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nenhum morador encontrado</Text>
                <Text style={styles.emptySubtitle}>
                  Os pontos dos integrantes da moradia aparecerão aqui assim que as tarefas forem
                  concluídas.
                </Text>
              </View>
            ) : (
              moradores.map((morador) => (
                <CardMoradorRanking
                  key={morador.uid}
                  morador={morador}
                  ehUsuarioLogado={morador.uid === perfil.uid}
                  maxPontos={maxPontos}
                />
              ))
            )}

            {/* Rodapé de Estatísticas Pessoais */}
            <View style={styles.bottomStatsCard}>
              <View style={styles.bottomStatItem}>
                <Text style={styles.bottomStatLabel}>Concluídas</Text>
                <Text style={[styles.bottomStatValue, { color: colors.primary }]}>
                  {usuarioAtual?.concluidas ?? 0}
                </Text>
              </View>

              <View style={styles.bottomStatDivider} />

              <View style={styles.bottomStatItem}>
                <Text style={styles.bottomStatLabel}>Cumprimento</Text>
                <Text style={[styles.bottomStatValue, { color: colors.greenFg }]}>
                  {usuarioAtual?.cumprimentoPercent ?? 0}%
                </Text>
              </View>

              <View style={styles.bottomStatDivider} />

              <View style={styles.bottomStatItem}>
                <Text style={styles.bottomStatLabel}>Melhor Posição</Text>
                <Text style={[styles.bottomStatValue, { color: '#D97706' }]}>
                  #{usuarioAtual?.melhorPosicao ?? minhaPosicao}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  loader: {
    marginTop: 48,
  },

  // Topbar
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  topbarSpacer: {
    width: 42,
    height: 42,
  },
  screenTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 20,
    color: colors.textDark,
  },
  helpBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar fallback
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontFamily: 'Sora-Bold',
    color: '#FFFFFF',
  },

  // Hero Card (usuário logado)
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EBF0F6',
    marginBottom: 24,
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroUserInfo: {
    flex: 1,
  },
  heroUserName: {
    fontFamily: 'Sora-Bold',
    fontSize: 18,
    color: colors.textDark,
    marginBottom: 3,
  },
  heroStreak: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#64748B',
  },
  lugarPill: {
    backgroundColor: colors.blueBg,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  lugarPillText: {
    fontFamily: 'Sora-Bold',
    fontSize: 13,
    color: colors.primary,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#EEF2F7',
    marginVertical: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
  },
  heroPointsCol: {
    flex: 1,
  },
  heroPointsLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    letterSpacing: 0.7,
    color: '#7B8BA3',
    marginBottom: 4,
  },
  heroPointsValue: {
    fontFamily: 'Sora-ExtraBold',
    fontSize: 25,
    color: colors.primary,
  },
  heroProgressCol: {
    width: '40%',
    paddingBottom: 4,
  },
  heroProgressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroProgressLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#7B8BA3',
  },
  heroProgressPercent: {
    fontFamily: 'Sora-Bold',
    fontSize: 12.5,
    color: colors.primary,
  },
  heroProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E6F0FF',
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // Seção Ranking
  sectionHeader: {
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionEyebrow: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#8A98AC',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 15,
    color: '#53647C',
  },

  // Card de cada morador
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EBF0F6',
    gap: 12,
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  rankCardLogado: {
    backgroundColor: '#E8F2FF',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  medalhaCirculo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalhaNumeroContainer: {
    position: 'absolute',
    left: 9,
    top: 12,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalhaNumeroSobreposto: {
    fontFamily: 'Sora-Bold',
    fontSize: 10,
    lineHeight: 12,
    includeFontPadding: false,
    textAlign: 'center',
  },
  posicaoNumero: {
    fontFamily: 'Sora-Bold',
    fontSize: 15,
    color: '#64748B',
  },
  rankInfo: {
    flex: 1,
  },
  rankNomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  rankNome: {
    fontFamily: 'Sora-Bold',
    fontSize: 15.5,
    color: colors.textDark,
    flexShrink: 1,
  },
  voceBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  voceBadgeText: {
    fontFamily: 'Sora-Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  rankPontosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankPontos: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    minWidth: 74,
  },
  rankBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8EFF8',
    overflow: 'hidden',
  },
  rankBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Rodapé de estatísticas
  bottomStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EBF0F6',
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  bottomStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  bottomStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#EEF2F7',
  },
  bottomStatLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#7B8BA3',
    marginBottom: 4,
  },
  bottomStatValue: {
    fontFamily: 'Sora-ExtraBold',
    fontSize: 20,
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
  },
  emptySubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13.5,
    color: '#7B8BA3',
    textAlign: 'center',
    lineHeight: 20,
  },
});
