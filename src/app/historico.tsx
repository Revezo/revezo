/**
 * Tela de Histórico — lista todos os ciclos criados para a moradia.
 * Ao clicar em um ciclo, o usuário acessa a visão detalhada por dias (historico/[cicloId].tsx).
 */

import { BottomNavBar, BottomNavTab } from '@/components/navigation/BottomNavBar';
import { colors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
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
import { auth, db } from '../firebaseConfig';
import { buscarInstanciasDoCiclo } from '../services/ciclos';
import { carregarPerfil, PerfilUsuario } from '../services/moradia';
import { Ciclo } from '../types/ciclo';

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function formatarPeriodoCiclo(ciclo: Ciclo): string {
  const ini = new Date(ciclo.inicioCiclo);
  const fim = new Date(ciclo.fimCiclo);
  const dIni = ini.getDate();
  const dFim = fim.getDate();
  const mIni = MESES_ABREV[ini.getMonth()];
  const mFim = MESES_ABREV[fim.getMonth()];

  if (ini.getMonth() === fim.getMonth()) {
    return `${dIni} ${mIni} - ${dFim} ${mFim}`;
  }
  return `${dIni} ${mIni} - ${dFim} ${mFim}`;
}

interface CicloResumoItem {
  ciclo: Ciclo;
  total: number;
  concluidas: number;
  percentual: number;
}

export default function HistoricoListaScreen() {
  const insets = useSafeAreaInsets();

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<BottomNavTab>('ciclo');
  const [ciclos, setCiclos] = useState<CicloResumoItem[]>([]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        try {
          const p = await carregarPerfil(usuario);
          setPerfil(p);
        } catch {
          setPerfil(null);
        }
      } else {
        setPerfil(null);
      }
      setCarregando(false);
    });
  }, []);

  const carregarDados = useCallback(async () => {
    if (!perfil) return;
    try {
      const q = query(
        collection(db, 'ciclos'),
        where('moradiaId', '==', perfil.moradiaId),
      );
      const snapshot = await getDocs(q);

      const docs = snapshot.docs.map((d) => {
        const dados = d.data();
        return {
          id: d.id,
          moradiaId: dados.moradiaId,
          mes: dados.mes,
          ano: dados.ano,
          numeroCiclo: dados.numeroCiclo,
          inicioCiclo: dados.inicioCiclo?.toDate?.() ?? new Date(),
          fimCiclo: dados.fimCiclo?.toDate?.() ?? new Date(),
          geradoEm: dados.geradoEm?.toDate?.() ?? new Date(),
          status: dados.status ?? 'futuro',
        } as Ciclo;
      });

      // Ordenar do mais recente para o mais antigo
      docs.sort((a, b) => {
        const tempoA = new Date(a.inicioCiclo).getTime();
        const tempoB = new Date(b.inicioCiclo).getTime();
        return tempoB - tempoA;
      });

      // Carregar estatísticas para cada ciclo
      const listaComResumo: CicloResumoItem[] = await Promise.all(
        docs.map(async (ciclo) => {
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

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!auth.currentUser) return <Redirect href="/login" />;

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
        {ciclos.length === 0 ? (
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
                      Ciclo {item.ciclo.numeroCiclo} de 4 {isAtivo ? '• Atual' : ''}
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
      <BottomNavBar
        activeTab={abaAtiva}
        onTabChange={(tab) => {
          setAbaAtiva(tab);
          if (tab === 'home') {
            router.replace('/');
          } else if (tab === 'ciclo') {
            router.push('/ciclo');
          } else if (tab === 'perfil') {
            Alert.alert('Perfil', 'A tela de perfil completa será desenvolvida em breve!');
          } else if (tab === 'trocas' || tab === 'ranking') {
            Alert.alert(
              tab.charAt(0).toUpperCase() + tab.slice(1),
              'Esta funcionalidade será disponibilizada na próxima etapa.',
            );
          }
        }}
        userInitial={inicialUsuario}
      />
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FD',
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
});
