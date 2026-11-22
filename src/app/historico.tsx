import { BottomNavBar } from '@/components/navigation/BottomNavBar';
import { navegarParaAba } from '@/components/navigation/navegacaoAbas';
import { colors } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { Feather } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
import { db } from '../firebaseConfig';
import { atualizarStatusCiclos, buscarInstanciasDoCiclo } from '../services/ciclos';
import { Ciclo } from '../types/ciclo';

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function parseData(valor: any): Date {
  if (!valor) return new Date();
  if (typeof valor.toDate === 'function') return valor.toDate();
  if (valor instanceof Date) return valor;
  if (typeof valor.seconds === 'number') return new Date(valor.seconds * 1000);
  const d = new Date(valor);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatarPeriodoCiclo(ciclo: Ciclo): string {
  const ini = new Date(ciclo.inicioCiclo);
  const fim = new Date(ciclo.fimCiclo);
  const dIni = String(ini.getDate()).padStart(2, '0');
  const dFim = String(fim.getDate()).padStart(2, '0');
  const mIni = MESES_ABREV[ini.getMonth()];
  const mFim = MESES_ABREV[fim.getMonth()];

  if (ini.getMonth() === fim.getMonth()) {
    return `${dIni} a ${dFim} de ${mFim}`;
  }
  return `${dIni} ${mIni} a ${dFim} ${mFim}`;
}

interface CicloResumoItem {
  ciclo: Ciclo;
  total: number;
  concluidas: number;
  percentual: number;
}

export default function HistoricoListaScreen() {
  const insets = useSafeAreaInsets();

  const { usuario, perfil } = useSessao();
  const [recarregando, setRecarregando] = useState(false);
  const [ciclos, setCiclos] = useState<CicloResumoItem[]>([]);
  const [ciclosCarregados, setCiclosCarregados] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!perfil) return;
    try {
      await atualizarStatusCiclos(perfil.moradiaId);

      const q = query(
        collection(db, 'ciclos'),
        where('moradiaId', '==', perfil.moradiaId),
      );
      const snapshot = await getDocs(q);

      const todosDocs = snapshot.docs.map((d) => {
        const dados = d.data();
        return {
          id: d.id,
          moradiaId: dados.moradiaId,
          mes: dados.mes,
          ano: dados.ano,
          numeroCiclo: dados.numeroCiclo,
          inicioCiclo: parseData(dados.inicioCiclo),
          fimCiclo: parseData(dados.fimCiclo),
          geradoEm: parseData(dados.geradoEm),
          status: dados.status ?? 'futuro',
        } as Ciclo;
      });

      const docsHistorico = todosDocs.filter((c) => c.status !== 'futuro');

      docsHistorico.sort((a, b) => {
        const tempoA = a.fimCiclo.getTime();
        const tempoB = b.fimCiclo.getTime();
        if (tempoB !== tempoA) return tempoB - tempoA;
        return b.inicioCiclo.getTime() - a.inicioCiclo.getTime();
      });

      const listaComResumo: CicloResumoItem[] = await Promise.all(
        docsHistorico.map(async (ciclo) => {
          const instancias = await buscarInstanciasDoCiclo(ciclo.id);
          const total = instancias.length;
          const concluidas = instancias.filter((i) => i.status === 'concluida').length;
          const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;
          return { ciclo, total, concluidas, percentual };
        }),
      );

      setCiclos(listaComResumo);
    } catch (e) {
      console.warn('Erro ao carregar histórico de ciclos:', e);
    } finally {
      setCiclosCarregados(true);
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

  if (!usuario) return <Redirect href="/login" />;

  const inicialUsuario = (perfil?.apelido || perfil?.nome || 'M').charAt(0).toUpperCase();

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
          <TouchableOpacity
            style={styles.circleBtn}
            activeOpacity={0.7}
            onPress={() => router.back()}
            accessibilityLabel="Voltar"
          >
            <Feather name="arrow-left" size={20} color={colors.textDark} />
          </TouchableOpacity>

          <Text style={styles.screenTitle}>Histórico</Text>

          <TouchableOpacity
            style={styles.circleBtn}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Histórico de Ciclos',
                'Veja o progresso e as tarefas de cada semana do mês. ' + 
                'Toque em um ciclo para ver o detalhamento dia a dia.',
              )
            }
            accessibilityLabel="Ajuda"
          >
            <Feather name="help-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Subtítulo informativo */}
        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>
            Ciclos e semanas registradas na moradia
          </Text>
        </View>

        {/* Lista de ciclos */}
        {!ciclosCarregados ? (
          <ActivityIndicator color={colors.primary} style={styles.listaCarregando} />
        ) : ciclos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum ciclo no histórico</Text>
            <Text style={styles.emptySubtitle}>
              O histórico será preenchido automaticamente conforme as tarefas forem sorteadas e
              concluídas semana a semana.
            </Text>
          </View>
        ) : (
          ciclos.map((item) => {
            const isAtivo = item.ciclo.status === 'ativo';
            return (
              <TouchableOpacity
                key={item.ciclo.id}
                style={[styles.cicloCard, isAtivo && styles.cicloCardAtivo]}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/historico/[cicloId]',
                    params: { cicloId: item.ciclo.id },
                  })
                }
              >
                <View style={styles.cicloCardHeader}>
                  <View style={styles.cicloCardInfoCol}>
                    <Text style={styles.cicloPeriodo}>
                      {formatarPeriodoCiclo(item.ciclo)}
                    </Text>
                    <Text style={styles.cicloSemanaLabel}>
                      Ciclo {item.ciclo.numeroCiclo} de 4
                    </Text>
                  </View>

                  {/* Badge de Porcentagem / Status */}
                  <View
                    style={[
                      styles.percentBadge,
                      isAtivo ? styles.percentBadgeActive : styles.percentBadgeNormal,
                    ]}
                  >
                    <Text
                      style={[
                        styles.percentBadgeText,
                        isAtivo && styles.percentBadgeTextActive,
                      ]}
                    >
                      {item.percentual}%
                    </Text>
                  </View>
                </View>

                {/* Barra de Progresso */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.max(item.percentual, item.total > 0 ? 6 : 0)}%` },
                    ]}
                  />
                </View>

                <View style={styles.cicloCardFooter}>
                  <Text style={styles.cicloResumoText}>
                    {item.concluidas} de {item.total} tarefas concluídas
                  </Text>
                  <View style={styles.verDetalhesRow}>
                    <Text style={styles.verDetalhesText}>Ver dias</Text>
                    <Feather name="chevron-right" size={16} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Barra de Navegação Flutuante */}
      <BottomNavBar activeTab="ciclo" onTabChange={navegarParaAba} userInitial={inicialUsuario} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FD',
  },
  listaCarregando: {
    marginTop: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Topbar
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 20,
    color: '#0B1B33',
  },

  headerInfo: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  headerSubtitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13.5,
    color: '#7B8BA3',
  },

  // Card do Ciclo
  cicloCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
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
  cicloCardAtivo: {
    borderColor: '#C7DDFF',
    backgroundColor: '#FFFFFF',
  },
  cicloCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cicloCardInfoCol: {
    flex: 1,
  },
  cicloPeriodo: {
    fontFamily: 'Sora-Bold',
    fontSize: 17,
    color: '#0B1B33',
    marginBottom: 3,
  },
  cicloSemanaLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#7B8BA3',
  },

  percentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  percentBadgeActive: {
    backgroundColor: '#2B7FFF',
  },
  percentBadgeNormal: {
    backgroundColor: '#EBF3FE',
  },
  percentBadgeText: {
    fontFamily: 'Sora-Bold',
    fontSize: 13,
    color: '#2B7FFF',
  },
  percentBadgeTextActive: {
    color: '#FFFFFF',
  },

  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#2B7FFF',
  },

  cicloCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cicloResumoText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#7B8BA3',
  },
  verDetalhesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verDetalhesText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#2B7FFF',
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBF0F6',
    marginTop: 10,
  },
  emptyTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 16,
    color: '#0B1B33',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13.5,
    color: '#7B8BA3',
    textAlign: 'center',
    lineHeight: 20,
  },
  badgeText: {
    fontSize: 12,
  }
});
