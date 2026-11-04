/**
 * Tela de Ciclos — exibe todas as instâncias de tarefas do ciclo atual (semana),
 * associadas a todos os moradores da moradia e seus respectivos status.
 * Visual fiel ao design do Revezo.
 */

import { BottomNavBar, BottomNavTab } from '@/components/navigation/BottomNavBar';
import { AppIcon } from '@/components/ui/Icons';
import { colors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { auth } from '../firebaseConfig';
import {
  atualizarStatusCiclos,
  buscarCicloAtivo,
  buscarCiclosDoMes,
  buscarInstanciasDoCiclo,
  calcularResumoCiclo,
  rodarMotorRotacao,
} from '../services/ciclos';
import { carregarPerfil, PerfilUsuario } from '../services/moradia';
import { listarTarefas } from '../services/tarefas';
import { InstanciaTarefa, StatusInstancia } from '../types/ciclo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatarHorarioExecucao(instancia: InstanciaTarefa): string {
  if (instancia.prazoFim) {
    const d = new Date(instancia.prazoFim);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `Até ${dia}/${mes}, entre 18h - 22h`;
  }
  return 'Hoje, entre 18h - 22h';
}

function verificarSeAtrasada(instancia: InstanciaTarefa): boolean {
  if (instancia.status === 'atrasada') return true;
  if (instancia.status === 'pendente' && instancia.prazoFim) {
    return new Date() > new Date(instancia.prazoFim);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Badge de Status
// ---------------------------------------------------------------------------

function StatusBadgePill({ status, atrasada }: { status: StatusInstancia; atrasada: boolean }) {
  if (status === 'concluida') {
    return (
      <View style={[styles.badgeBase, styles.badgeFinalizado]}>
        <Text style={[styles.badgeText, styles.badgeTextFinalizado]}>Finalizado</Text>
      </View>
    );
  }

  if (atrasada || status === 'atrasada') {
    return (
      <View style={[styles.badgeBase, styles.badgeAtrasado]}>
        <Text style={[styles.badgeText, styles.badgeTextAtrasado]}>Pendente</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badgeBase, styles.badgePendente]}>
      <Text style={[styles.badgeText, styles.badgeTextPendente]}>Pendente</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Card de Tarefa
// ---------------------------------------------------------------------------

function TarefaCardItem({
  instancia,
  ehUsuarioLogado,
}: {
  instancia: InstanciaTarefa;
  ehUsuarioLogado: boolean;
}) {
  const atrasada = verificarSeAtrasada(instancia);
  const fotosNecessarias = Math.max(1, Math.min(3, Math.ceil(instancia.tarefaPeso / 2)));
  const fotosConcluidas = instancia.fotos.length;
  const horarioTexto = formatarHorarioExecucao(instancia);

  // Nome exibido do responsável (se for o próprio usuário, indica "(Você)")
  const nomeResponsavel = ehUsuarioLogado
    ? `${instancia.usuarioNome} (Você)`
    : instancia.usuarioNome || 'Oculto';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => {
        router.push({
          pathname: '/detalhes-da-tarefa',
          params: { id: instancia.id },
        });
      }}
    >
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardInfoCol}>
          <Text style={styles.cardTitle}>{instancia.tarefaNome}</Text>
          <Text style={styles.cardSubtitle}>Responsável – {nomeResponsavel}</Text>
          <Text style={styles.cardTimeText}>{horarioTexto}</Text>

          {/* Linha de Peso com bolinhas */}
          <View style={styles.pesoRow}>
            <Text style={styles.pesoLabel}>Peso</Text>
            <View style={styles.dotsRow}>
              {[1, 2, 3, 4, 5].map((idx) => {
                const preenchida = idx <= instancia.tarefaPeso;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      preenchida ? styles.dotFilled : styles.dotEmpty,
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>

        {/* Lado direito: Badge e Fotos */}
        <View style={styles.cardRightCol}>
          <StatusBadgePill status={instancia.status} atrasada={atrasada} />

          <View style={styles.fotosContainer}>
            <Text style={styles.fotosText}>
              {fotosConcluidas}/{fotosNecessarias} fotos
            </Text>
            <AppIcon name="arrowRight" size={13} color={colors.primary} strokeWidth={2.6} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Tela Principal
// ---------------------------------------------------------------------------

export default function CiclosScreen() {
  const insets = useSafeAreaInsets();

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<BottomNavTab>('ciclo');

  const [instancias, setInstancias] = useState<InstanciaTarefa[]>([]);

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
      await atualizarStatusCiclos(perfil.moradiaId);

      let ativo = await buscarCicloAtivo(perfil.moradiaId);

      // Se ainda não existir nenhum ciclo ativo, tenta gerar automaticamente
      if (!ativo) {
        const ciclosExistentes = await buscarCiclosDoMes(perfil.moradiaId);
        if (ciclosExistentes.length === 0) {
          const tarefasCadastradas = await listarTarefas(perfil.moradiaId);
          if (tarefasCadastradas.length > 0) {
            await rodarMotorRotacao(perfil.moradiaId, tarefasCadastradas);
            ativo = await buscarCicloAtivo(perfil.moradiaId);
          }
        } else {
          // Usa o primeiro ciclo disponível se nenhum estiver explicitamente com status ativo
          ativo = ciclosExistentes[0];
        }
      }


      if (ativo) {
        const lista = await buscarInstanciasDoCiclo(ativo.id);
        setInstancias(lista);
      } else {
        setInstancias([]);
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do ciclo:', e);
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

  const resumo = useMemo(() => calcularResumoCiclo(instancias), [instancias]);

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
        {/* Topbar com botão voltar, título Ciclos e botão de ajuda */}
        <View style={styles.topbar}>
          <TouchableOpacity
            style={styles.circleBtn}
            activeOpacity={0.7}
            onPress={() => router.replace('/')}
            accessibilityLabel="Voltar"
          >
            <Feather name="arrow-left" size={20} color={colors.textDark} />
          </TouchableOpacity>

          <Text style={styles.screenTitle}>Ciclos</Text>

          <TouchableOpacity
            style={styles.circleBtn}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Sobre os Ciclos',
                'O Revezo divide o mês em 4 ciclos semanais. Cada morador recebe tarefas ' + 
                'equilibradas pelo peso de dificuldade.',
              )
            }
            accessibilityLabel="Ajuda"
          >
            <Feather name="help-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Botão Acessar Histórico */}
        <TouchableOpacity
          style={styles.btnAcessarHistorico}
          activeOpacity={0.8}
          onPress={() => router.push('/historico')}
        >
          <Text style={styles.btnAcessarHistoricoTexto}>Acessar histórico</Text>
        </TouchableOpacity>

        {/* Card de Progresso do Ciclo */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>
            {resumo.concluidas} de {resumo.total} tarefas concluídas
          </Text>

          <View style={styles.progressRow}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(resumo.percentual, resumo.total > 0 ? 6 : 0)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercentText}>{resumo.percentual}%</Text>
          </View>
        </View>

        {/* Cabeçalho da Seção de Tarefas da Semana */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>TAREFAS DA SEMANA</Text>
          <Text style={styles.sectionCountText}>
            {resumo.pendentes} {resumo.pendentes === 1 ? 'em aberto' : 'em aberto'}
          </Text>
        </View>

        {/* Lista de instâncias de tarefas de todos os moradores */}
        {instancias.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhuma tarefa neste ciclo</Text>
            <Text style={styles.emptySubtitle}>
              Assim que o administrador cadastrar tarefas, o motor de rotação criará a lista
              semanal automaticamente.
            </Text>
          </View>
        ) : (
          instancias.map((instancia) => (
            <TarefaCardItem
              key={instancia.id}
              instancia={instancia}
              ehUsuarioLogado={instancia.usuarioId === perfil?.uid}
            />
          ))
        )}
      </ScrollView>

      {/* Barra de Navegação Flutuante */}
      <BottomNavBar
        activeTab={abaAtiva}
        onTabChange={(tab) => {
          setAbaAtiva(tab);
          if (tab === 'home') {
            router.replace('/');
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
    marginBottom: 18,
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

  // Botão Acessar Histórico
  btnAcessarHistorico: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3D84FA',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3D84FA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  btnAcessarHistoricoTexto: {
    fontFamily: 'Sora-Bold',
    fontSize: 15,
    color: '#3D84FA',
  },

  // Card de Progresso
  progressCard: {
    backgroundColor: '#EBF3FE',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  progressTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 14.5,
    color: '#0B1B33',
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: '#2B7FFF',
  },
  progressPercentText: {
    fontFamily: 'Sora-Bold',
    fontSize: 14,
    color: '#2B7FFF',
    minWidth: 36,
    textAlign: 'right',
  },

  // Seção
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#8A98AC',
  },
  sectionCountText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#8A98AC',
  },

  // Card de Tarefa
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EBF0F6',
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardInfoCol: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 17,
    color: '#0B1B33',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#7B8BA3',
    marginBottom: 2,
  },
  cardTimeText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#7B8BA3',
    marginBottom: 6,
  },

  // Peso
  pesoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  pesoLabel: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#7B8BA3',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotFilled: {
    backgroundColor: '#2B7FFF',
  },
  dotEmpty: {
    backgroundColor: '#DCE4EE',
  },

  // Lado direito do card
  cardRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 82,
  },
  fotosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  fotosText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12.5,
    color: '#2B7FFF',
  },

  // Badges
  badgeBase: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFinalizado: {
    backgroundColor: '#E6F9EE',
  },
  badgeTextFinalizado: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12.5,
    color: '#18A957',
  },
  badgePendente: {
    backgroundColor: '#EEF2F6',
  },
  badgeTextPendente: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12.5,
    color: '#475569',
  },
  badgeAtrasado: {
    backgroundColor: '#FEECEB',
  },
  badgeTextAtrasado: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12.5,
    color: '#EA4335',
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
    marginBottom: 0,
  },
  btnCriarTarefa: {
    backgroundColor: '#2B7FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnCriarTarefaTexto: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  badgeText: {
    fontSize: 12,
  }
});
