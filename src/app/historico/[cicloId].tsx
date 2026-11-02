/**
 * Tela de Detalhes do Ciclo no Histórico (visão dia a dia com sanfona/accordion).
 * Fiel ao segundo mockup de Histórico fornecido pelo usuário.
 */

import { BottomNavBar, BottomNavTab } from '@/components/navigation/BottomNavBar';
import { colors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
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
import { auth, db } from '../../firebaseConfig';
import { carregarPerfil, PerfilUsuario } from '../../services/moradia';
import { buscarInstanciasDoCiclo } from '../../services/ciclos';
import { Ciclo, InstanciaTarefa, StatusInstancia } from '../../types/ciclo';

// ---------------------------------------------------------------------------
// Helpers de datas e dias
// ---------------------------------------------------------------------------

const DIAS_NOMES_COMPLETOS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function formatarPeriodoSemana(ciclo: Ciclo): string {
  const ini = new Date(ciclo.inicioCiclo);
  const fim = new Date(ciclo.fimCiclo);
  const dIni = ini.getDate();
  const dFim = fim.getDate();
  const mIni = MESES_ABREV[ini.getMonth()];
  const mFim = MESES_ABREV[fim.getMonth()];

  return `${dIni} ${mIni} - ${dFim} ${mFim}`;
}

interface DiaDoCiclo {
  nome: string;
  dataTexto: string;
  data: Date;
  tarefas: InstanciaTarefa[];
  concluidas: number;
}

// ---------------------------------------------------------------------------
// Badge de Status do Item
// ---------------------------------------------------------------------------

function StatusBadgeItem({ status }: { status: StatusInstancia }) {
  if (status === 'concluida') {
    return (
      <View style={[styles.badgeBase, styles.badgeFinalizado]}>
        <Text style={[styles.badgeText, styles.badgeTextFinalizado]}>Finalizado</Text>
      </View>
    );
  }

  if (status === 'atrasada') {
    return (
      <View style={[styles.badgeBase, styles.badgeAtrasado]}>
        <Text style={[styles.badgeText, styles.badgeTextAtrasado]}>Atrasado</Text>
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
// Item de Tarefa dentro do Accordion expandido
// ---------------------------------------------------------------------------

function TarefaAccordionItem({ instancia }: { instancia: InstanciaTarefa }) {
  const nomeResponsavel = instancia.usuarioNome || 'Oculto';
  const horario = '18h - 22h';

  return (
    <View style={styles.itemTarefaContainer}>
      <View style={styles.itemTarefaInfoCol}>
        <Text style={styles.itemTarefaTitulo}>{instancia.tarefaNome}</Text>
        <Text style={styles.itemTarefaMeta}>
          {nomeResponsavel}   Peso {instancia.tarefaPeso}   {horario}
        </Text>
      </View>

      <StatusBadgeItem status={instancia.status} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tela Principal de Detalhes
// ---------------------------------------------------------------------------

export default function HistoricoCicloDetalheScreen() {
  const insets = useSafeAreaInsets();
  const { cicloId } = useLocalSearchParams<{ cicloId: string }>();

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<BottomNavTab>('ciclo');

  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [instancias, setInstancias] = useState<InstanciaTarefa[]>([]);

  // Estado para controlar quais dias estão expandidos (índices 0..6)
  const [diasAbertos, setDiasAbertos] = useState<Record<number, boolean>>({
    2: true, // Terça-feira aberta por padrão (igual ao print)
  });

  const alternarDia = (indice: number) => {
    setDiasAbertos((prev) => ({
      ...prev,
      [indice]: !prev[indice],
    }));
  };

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
    });
  }, []);

  useEffect(() => {
    async function carregar() {
      if (!cicloId) {
        setCarregando(false);
        return;
      }
      try {
        const cicloSnap = await getDoc(doc(db, 'ciclos', cicloId));
        if (cicloSnap.exists()) {
          const dados = cicloSnap.data();
          const objCiclo: Ciclo = {
            id: cicloSnap.id,
            moradiaId: dados.moradiaId,
            mes: dados.mes,
            ano: dados.ano,
            numeroCiclo: dados.numeroCiclo,
            inicioCiclo: dados.inicioCiclo?.toDate?.() ?? new Date(),
            fimCiclo: dados.fimCiclo?.toDate?.() ?? new Date(),
            geradoEm: dados.geradoEm?.toDate?.() ?? new Date(),
            status: dados.status ?? 'futuro',
          };
          setCiclo(objCiclo);

          const tarefasDoCiclo = await buscarInstanciasDoCiclo(cicloSnap.id);
          setInstancias(tarefasDoCiclo);
        }
      } catch (e) {
        console.warn('Erro ao carregar detalhe do ciclo:', e);
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [cicloId]);

  // Agrupamento dos 7 dias do ciclo
  const diasDaSemana = useMemo<DiaDoCiclo[]>(() => {
    if (!ciclo) return [];

    const dias: DiaDoCiclo[] = [];
    const inicio = new Date(ciclo.inicioCiclo);

    // Cria os 7 dias da semana a partir do início do ciclo
    for (let i = 0; i < 7; i++) {
      const dataDia = new Date(inicio);
      dataDia.setDate(inicio.getDate() + i);

      const diaSemanaIndex = dataDia.getDay();
      const nomeDia = DIAS_NOMES_COMPLETOS[diaSemanaIndex];
      const diaFormatado = String(dataDia.getDate()).padStart(2, '0');
      const mesFormatado = String(dataDia.getMonth() + 1).padStart(2, '0');
      const dataTexto = `${diaFormatado}/${mesFormatado}`;

      // Distribui as tarefas pelas datas da semana
      const tarefasDoDia = instancias.filter((_, idx) => idx % 7 === i);
      const concluidasDoDia = tarefasDoDia.filter((t) => t.status === 'concluida').length;

      dias.push({
        nome: nomeDia,
        dataTexto,
        data: dataDia,
        tarefas: tarefasDoDia,
        concluidas: concluidasDoDia,
      });
    }

    return dias;
  }, [ciclo, instancias]);

  // Percentual total do ciclo
  const percentualTotal = useMemo(() => {
    if (instancias.length === 0) return 0;
    const concluidas = instancias.filter((t) => t.status === 'concluida').length;
    return Math.round((concluidas / instancias.length) * 100);
  }, [instancias]);

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
      >
        {/* Topbar: <  Histórico  ? */}
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
                'Visão Semanal',
                'Nesta tela você confere as tarefas distribuídas em cada dia da semana e o status de finalização.',
              )
            }
            accessibilityLabel="Ajuda"
          >
            <Feather name="help-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Linha de Período e Badge 97% */}
        <View style={styles.periodoRow}>
          <Text style={styles.periodoTexto}>
            {ciclo ? formatarPeriodoSemana(ciclo) : 'Semana Selecionada'}
          </Text>

          <View style={styles.percentBadgePill}>
            <Text style={styles.percentBadgePillText}>{percentualTotal}%</Text>
          </View>
        </View>

        {/* Lista de Dias (Accordion) */}
        <View style={styles.accordionContainer}>
          {diasDaSemana.map((dia, index) => {
            const aberto = !!diasAbertos[index];
            const totalTarefasDia = dia.tarefas.length;
            const concluidasDia = dia.concluidas;

            // Texto resumo (ex.: "3 tarefas • 2 concluídas")
            const textoResumo = `${totalTarefasDia} ${
              totalTarefasDia === 1 ? 'tarefa' : 'tarefas'
            } • ${concluidasDia} ${concluidasDia === 1 ? 'concluída' : 'concluídas'}`;

            return (
              <View key={dia.dataTexto + index} style={styles.diaCard}>
                {/* Cabeçalho do dia */}
                <TouchableOpacity
                  style={styles.diaHeader}
                  activeOpacity={0.7}
                  onPress={() => alternarDia(index)}
                >
                  <View style={styles.diaHeaderLeft}>
                    <Text style={styles.diaNome}>{dia.nome}</Text>
                    <Text style={styles.diaData}>{dia.dataTexto}</Text>
                  </View>

                  <View style={styles.diaHeaderRight}>
                    <Text style={styles.diaResumo}>{textoResumo}</Text>
                    <Feather
                      name={aberto ? 'chevron-down' : 'chevron-right'}
                      size={18}
                      color={aberto ? colors.primary : '#8A98AC'}
                    />
                  </View>
                </TouchableOpacity>

                {/* Conteúdo expandido com as tarefas do dia */}
                {aberto && (
                  <View style={styles.diaConteudo}>
                    {dia.tarefas.length === 0 ? (
                      <View style={styles.diaVazioContainer}>
                        <Text style={styles.diaVazioTexto}>
                          Nenhuma tarefa programada para este dia.
                        </Text>
                      </View>
                    ) : (
                      dia.tarefas.map((tarefa) => (
                        <TarefaAccordionItem key={tarefa.id} instancia={tarefa} />
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
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
    marginBottom: 20,
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

  // Linha de Período e Porcentagem
  periodoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  periodoTexto: {
    fontFamily: 'Sora-Bold',
    fontSize: 16,
    color: '#0B1B33',
  },
  percentBadgePill: {
    backgroundColor: '#2B7FFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  percentBadgePillText: {
    fontFamily: 'Sora-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  // Accordion
  accordionContainer: {
    gap: 12,
  },
  diaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EBF0F6',
    overflow: 'hidden',
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  diaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  diaHeaderLeft: {
    gap: 2,
  },
  diaNome: {
    fontFamily: 'Sora-Bold',
    fontSize: 16,
    color: '#0B1B33',
  },
  diaData: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#7B8BA3',
  },
  diaHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diaResumo: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12.5,
    color: '#7B8BA3',
  },

  // Conteúdo interno do Accordion
  diaConteudo: {
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
    padding: 14,
    gap: 10,
    backgroundColor: '#FAFCFE',
  },
  diaVazioContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  diaVazioTexto: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#94A3B8',
  },

  // Item de Tarefa dentro do dia
  itemTarefaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  itemTarefaInfoCol: {
    flex: 1,
  },
  itemTarefaTitulo: {
    fontFamily: 'Sora-Bold',
    fontSize: 14,
    color: '#0B1B33',
    marginBottom: 4,
  },
  itemTarefaMeta: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#7B8BA3',
  },

  // Badges
  badgeBase: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFinalizado: {
    backgroundColor: '#E6F9EE',
  },
  badgeTextFinalizado: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    color: '#18A957',
  },
  badgePendente: {
    backgroundColor: '#EEF2F6',
  },
  badgeTextPendente: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    color: '#475569',
  },
  badgeAtrasado: {
    backgroundColor: '#FEECEB',
  },
  badgeTextAtrasado: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    color: '#EA4335',
  },
});
