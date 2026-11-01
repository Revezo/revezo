import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { TelaCarregando } from '@/components/TelaCarregando';
import { BottomNavBar, BottomNavTab } from '@/components/navigation/BottomNavBar';
import { AppIcon } from '@/components/ui/Icons';
import { colors } from '@/constants/theme';
import { auth } from '../firebaseConfig';
import {
  PerfilUsuario,
  carregarPerfil,
  ehAdministrador,
} from '../services/moradia';
import { excluirTarefa, listarTarefas } from '../services/tarefas';
import {
  DIAS_SEMANA,
  Tarefa,
  descreverFrequencia,
  proximoSorteio,
} from '../types/tarefa';

// Tempo mínimo da tela de carregamento na abertura do app
const TEMPO_MINIMO_CARREGAMENTO_MS = 3000;
let carregamentoJaExibido = false;

const RADIUS = 31;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~194.78

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [exibindoCarregamento, setExibindoCarregamento] = useState(!carregamentoJaExibido);
  const [abaAtiva, setAbaAtiva] = useState<BottomNavTab>('home');
  const [recarregando, setRecarregando] = useState(false);

  // Controle local de fotos por tarefa
  const [fotosTarefas, setFotosTarefas] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!exibindoCarregamento) return;
    const temporizador = setTimeout(() => {
      carregamentoJaExibido = true;
      setExibindoCarregamento(false);
    }, TEMPO_MINIMO_CARREGAMENTO_MS);
    return () => clearTimeout(temporizador);
  }, [exibindoCarregamento]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (atual) => {
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
    });
  }, []);

  const atualizarLista = useCallback(async () => {
    if (!perfil) return;
    try {
      const lista = await listarTarefas(perfil.moradiaId);
      setTarefas(lista);
    } catch (erro: any) {
      Alert.alert('Erro ao carregar tarefas', erro.message);
    }
  }, [perfil]);

  useFocusEffect(
    useCallback(() => {
      atualizarLista();
    }, [atualizarLista]),
  );

  const handleRefresh = async () => {
    setRecarregando(true);
    await atualizarLista();
    setRecarregando(false);
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

  // Fotos necessárias por tarefa (baseado no peso ou mínimo 1)
  const getFotosNecessarias = (t: Tarefa) => Math.max(1, Math.min(3, Math.ceil(t.pesoDificuldade / 2)));
  const getFotosConcluidas = (t: Tarefa) => fotosTarefas[t.id] ?? 0;
  const isTarefaConcluida = (t: Tarefa) => getFotosConcluidas(t) >= getFotosNecessarias(t);

  const handleAdicionarFoto = (t: Tarefa) => {
    const necessarias = getFotosNecessarias(t);
    const atuais = getFotosConcluidas(t);
    if (atuais >= necessarias) return;

    const novas = atuais + 1;
    setFotosTarefas((prev) => ({ ...prev, [t.id]: novas }));

    if (novas >= necessarias) {
      Alert.alert('Tarefa concluída!', `Você enviou todas as fotos de "${t.nome}".`);
    } else {
      Alert.alert('Foto adicionada', `Foto ${novas}/${necessarias} registrada com sucesso.`);
    }
  };

  // Cálculo de dias restantes para o sorteio
  const { diasRestantesTexto, sorteioSubtitulo } = useMemo(() => {
    const sorteio = proximoSorteio();
    const agora = new Date();
    const diffMs = sorteio.getTime() - agora.getTime();
    const dias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const diasRestantesTexto = dias === 1 ? '1 dia' : `${dias} dias`;

    const DIAS_NOMES = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    const diaNome = DIAS_NOMES[sorteio.getDay()];
    const hora = String(sorteio.getHours()).padStart(2, '0');
    const min = String(sorteio.getMinutes()).padStart(2, '0');
    const sorteioSubtitulo = `${diaNome}, às ${hora}h${min !== '00' ? min : ''}`;

    return { diasRestantesTexto, sorteioSubtitulo };
  }, []);

  // Metadados visuais de cada tarefa (ícone e tom de cor)
  const getMeta = (t: Tarefa) => {
    const n = t.nome.toLowerCase();
    if (n.includes('louça') || n.includes('lavar') || n.includes('água') || n.includes('agua')) {
      return { icon: 'droplet' as const, tone: 'blue' as const };
    }
    if (n.includes('lixo') || n.includes('descarte') || n.includes('recicl')) {
      return { icon: 'trash' as const, tone: 'green' as const };
    }
    if (n.includes('banheiro') || n.includes('limp') || n.includes('faxina') ||
     n.includes('quarto') || n.includes('sala')) {
      return { icon: 'sparkle' as const, tone: 'violet' as const };
    }
    return { icon: 'check' as const, tone: 'blue' as const };
  };

  // Agrupamento de tarefas por dia
  const tarefasPorDia = useMemo(() => {
    const grupos: Record<string, Tarefa[]> = {};
    tarefas.forEach((t) => {
      let diaLabel = 'Neste ciclo';
      if (t.proximoSorteioElegivel) {
        const d = new Date(t.proximoSorteioElegivel);
        const diaSem = DIAS_SEMANA[d.getDay()];
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        diaLabel = `${diaSem}. ${dia}/${mes}`;
      }
      if (!grupos[diaLabel]) grupos[diaLabel] = [];
      grupos[diaLabel].push(t);
    });
    return grupos;
  }, [tarefas]);

  // Contadores
  const totalTarefas = tarefas.length;
  const concluidas = tarefas.filter(isTarefaConcluida).length;
  const pendentes = totalTarefas - concluidas;
  const offset = totalTarefas > 0 ? CIRCUMFERENCE * (1 - concluidas / totalTarefas) : CIRCUMFERENCE;

  if (carregando || exibindoCarregamento) return <TelaCarregando />;

  if (!usuario) return <Redirect href="/onboarding" />;

  // Tela para usuário ainda sem moradia vinculada
  if (!perfil) {
    return (
      <View style={[styles.container, { justifyContent: 'center', padding: 24 }]}>
        <View style={styles.bemVindoContainer}>
          <Text style={{ fontSize: 60 }}>🏡</Text>
          <Text style={styles.bemVindoTitulo}>Bem-vindo!</Text>
          <Text style={styles.bemVindoSub}>
            Como deseja começar a organizar as tarefas do seu lar?
          </Text>
        </View>

        <TouchableOpacity
          style={styles.botaoFluxo}
          activeOpacity={0.8}
          onPress={() => router.push('/criar-moradia')}
        >
          <Text style={styles.botaoFluxoTitulo}>🏠 Criar uma Moradia</Text>
          <Text style={styles.botaoFluxoSubtexto}>
            Configure seu lar do zero e convide outros moradores.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoFluxo}
          activeOpacity={0.8}
          onPress={() => router.push('/entrar-moradia')}
        >
          <Text style={styles.botaoFluxoTitulo}>🚪 Entrar com Código</Text>
          <Text style={styles.botaoFluxoSubtexto}>
            Já tem um código de convite? Junte-se à sua casa.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sair} onPress={() => signOut(auth)}>
          <Text style={styles.sairTexto}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const admin = ehAdministrador(perfil);

  // Nome a ser exibido:
  // Se houver apelido na moradia, usa o apelido diretamente.
  // Senão, usa o primeiro nome cadastrado no Firebase.
  const nomeExibicao = (perfil.apelido || perfil.nome || 'Morador').trim();
  const primeiroNome = perfil.apelido ? perfil.apelido.trim() : nomeExibicao.split(' ')[0];
  const inicialUsuario = (perfil.apelido || perfil.nome || 'M').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(48, insets.top + 12) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={recarregando}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
          />
        }
      >
        {/* Background Gradient Hero fixado no conteúdo da tela: anda junto com o scroll para cima e para baixo */}
        <LinearGradient
          colors={['#4A90FF', '#4A90FF', '#2C70F0', '#3D84FA', '#A9CCFF', '#E3EEFF', '#F4F7FD']}
          locations={[0, 0.45, 0.58, 0.70, 0.82, 0.94, 1]}
          style={styles.heroBackground}
          pointerEvents="none"
        />

        {/* Topbar: Seletor de moradia (house pill) e botão de notificações */}
        <View style={styles.topbar}>
          <TouchableOpacity
            style={styles.housePill}
            activeOpacity={0.8}
            onPress={() => router.push('/minhas-moradias')}
          >
            <AppIcon name="home" size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.housePillText} numberOfLines={1}>
              {perfil.moradiaNome}
            </Text>
            <AppIcon name="chevronDown" size={14} color="#FFFFFF" strokeWidth={2.6} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Notificações', 'Você está em dia com todas as notificações!')}
            accessibilityLabel="Notificações"
          >
            <AppIcon name="bell" size={20} color="#FFFFFF" strokeWidth={2} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Saudação com o nome/apelido cadastrado e resumo de tarefas */}
        <View style={styles.greeting}>
          <Text style={styles.greetingSmall}>Bom dia,</Text>
          <Text style={styles.greetingName}>{primeiroNome}</Text>
          <Text style={styles.greetingSub}>
            {pendentes === 0
              ? 'Tudo certo! Você concluiu as tarefas do ciclo.'
              : `Você tem ${pendentes} ${pendentes === 1 ? 'tarefa' : 'tarefas'} em aberto neste ciclo.`}
          </Text>
        </View>

        {/* Hero Card Principal: Contagem regressiva do sorteio, anel de progresso e estatísticas */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroInfo}>
              <View style={styles.eyebrow}>
                <AppIcon name="clock" size={14} color={colors.primaryInk} strokeWidth={2.4} />
                <Text style={styles.eyebrowText}>PRÓXIMO SORTEIO</Text>
              </View>

              <Text style={styles.heroTitle}>
                Faltam <Text style={styles.heroTitleHighlight}>{diasRestantesTexto}</Text>
              </Text>
              <Text style={styles.heroSub}>{sorteioSubtitulo}</Text>
            </View>

            {/* Anel de progresso circular SVG */}
            <View style={styles.ringContainer}>
              <Svg width={76} height={76} viewBox="0 0 76 76">
                <Circle
                  cx={38}
                  cy={38}
                  r={RADIUS}
                  fill="none"
                  stroke="#E1EAF8"
                  strokeWidth={8}
                />
                <Circle
                  cx={38}
                  cy={38}
                  r={RADIUS}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray={`${CIRCUMFERENCE}`}
                  strokeDashoffset={offset}
                  originX={38}
                  originY={38}
                  rotation={-90}
                />
              </Svg>

              <View style={styles.ringLabel} pointerEvents="none">
                <Text style={styles.ringNumber}>
                  {concluidas}/{totalTarefas}
                </Text>
                <Text style={styles.ringSub}>feitas</Text>
              </View>
            </View>
          </View>

          {/* Cards de estatísticas */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.toneBlue]}>
              <View style={styles.statTop}>
                <AppIcon name="star" size={16} color={colors.blueFg} strokeWidth={2.4} />
                <Text style={[styles.statValue, { color: colors.blueFg }]}>30</Text>
              </View>
              <Text style={[styles.statLabel, { color: '#244F9E' }]}>
                Pontos em{'\n'}30 dias
              </Text>
            </View>

            <View style={[styles.statCard, styles.toneGreen]}>
              <View style={styles.statTop}>
                <AppIcon name="check" size={16} color={colors.greenFg} strokeWidth={2.6} />
                <Text style={[styles.statValue, { color: colors.greenFg }]}>5</Text>
              </View>
              <Text style={[styles.statLabel, { color: '#1B6035' }]}>
                Ciclos sem{'\n'}atraso
              </Text>
            </View>

            <View style={[styles.statCard, styles.toneCoral]}>
              <View style={styles.statTop}>
                <AppIcon name="clock" size={16} color={colors.coralFg} strokeWidth={2.4} />
                <Text style={[styles.statValue, { color: colors.coralFg }]}>{pendentes}</Text>
              </View>
              <Text style={[styles.statLabel, { color: '#8C3324' }]}>
                Tarefas{'\n'}pendentes
              </Text>
            </View>
          </View>
        </View>

        {/* Faixa de erro de exclusão */}
        {erroExclusao && (
          <View style={styles.faixaErro}>
            <Text style={styles.faixaErroTexto}>{erroExclusao}</Text>
            <TouchableOpacity onPress={() => setErroExclusao(null)}>
              <Text style={styles.faixaErroFechar}>Fechar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cabeçalho da Seção "Tarefas do ciclo" */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tarefas do ciclo</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{pendentes} em aberto</Text>
          </View>
        </View>

        {/* Lista de tarefas ou estado vazio */}
        {totalTarefas === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {admin
                ? 'Nenhuma tarefa cadastrada ainda. Comece criando a primeira para sua moradia!'
                : 'A moradia ainda não tem tarefas cadastradas neste ciclo.'}
            </Text>
            {admin && (
              <TouchableOpacity
                style={styles.btnCriarVazio}
                activeOpacity={0.8}
                onPress={() => router.push('/nova-tarefa')}
              >
                <AppIcon name="plus" size={18} color="#FFFFFF" strokeWidth={2.6} />
                <Text style={styles.btnCriarVazioTexto}>Cadastrar primeira tarefa</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          Object.entries(tarefasPorDia).map(([diaLabel, listaDoDia]) => (
            <View key={diaLabel} style={styles.diaGrupo}>
              <Text style={styles.dayLabel}>{diaLabel}</Text>
              <View style={styles.taskList}>
                {listaDoDia.map((tarefa) => {
                  const concluida = isTarefaConcluida(tarefa);
                  const necessarias = getFotosNecessarias(tarefa);
                  const concluidasFotos = getFotosConcluidas(tarefa);
                  const meta = getMeta(tarefa);

                  const tileBg =
                    meta.tone === 'blue'
                      ? colors.blueBg
                      : meta.tone === 'green'
                        ? colors.greenBg
                        : meta.tone === 'violet'
                          ? colors.violetBg
                          : colors.coralBg;

                  const tileFg =
                    meta.tone === 'blue'
                      ? colors.blueFg
                      : meta.tone === 'green'
                        ? colors.greenFg
                        : meta.tone === 'violet'
                          ? colors.violetFg
                          : colors.coralFg;

                  return (
                    <View key={tarefa.id} style={styles.taskCard}>
                      <View style={[styles.taskTile, { backgroundColor: tileBg }]}>
                        <AppIcon name={meta.icon} size={22} color={tileFg} strokeWidth={2.2} />
                      </View>

                      <View style={styles.taskBody}>
                        <Text style={styles.taskTitle}>{tarefa.nome}</Text>
                        <Text style={styles.taskWhen}>
                          {descreverFrequencia(tarefa.frequencia)}
                        </Text>

                        {/* Indicador de peso com bolinhas */}
                        <View style={styles.weightRow}>
                          <Text style={styles.weightLabel}>Peso</Text>
                          <View style={styles.weightDots}>
                            {[1, 2, 3, 4, 5].map((num) => (
                              <View
                                key={num}
                                style={[
                                  styles.weightDot,
                                  num <= tarefa.pesoDificuldade && styles.weightDotOn,
                                ]}
                              />
                            ))}
                          </View>
                        </View>

                        {/* Confirmação de exclusão pelo administrador */}
                        {admin && confirmandoId === tarefa.id && (
                          <View style={styles.confirmacao}>
                            <Text style={styles.confirmacaoTexto}>Remover dos sorteios?</Text>
                            <View style={styles.confirmacaoBotoes}>
                              <TouchableOpacity
                                style={styles.confirmacaoBotao}
                                onPress={() => setConfirmandoId(null)}
                                disabled={excluindoId === tarefa.id}
                              >
                                <Text style={styles.manter}>Manter</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.confirmacaoBotao}
                                onPress={() => excluir(tarefa)}
                                disabled={excluindoId === tarefa.id}
                              >
                                <Text style={styles.confirmarExclusaoTexto}>
                                  {excluindoId === tarefa.id ? 'Excluindo...' : 'Confirmar'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={styles.taskSide}>
                        <View
                          style={[
                            styles.statusBadge,
                            concluida ? styles.statusBadgeDone : styles.statusBadgePending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              concluida ? styles.statusTextDone : styles.statusTextPending,
                            ]}
                          >
                            {concluida ? 'Concluída' : 'Pendente'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.photosBtn}
                          activeOpacity={0.7}
                          onPress={() => handleAdicionarFoto(tarefa)}
                          disabled={concluida}
                        >
                          {concluida ? (
                            <View style={styles.photosBtnInner}>
                              <AppIcon name="check" size={14} color={colors.greenFg} strokeWidth={2.8} />
                              <Text style={[styles.photosBtnText, { color: colors.greenFg }]}>
                                {concluidasFotos}/{necessarias} fotos
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.photosBtnInner}>
                              <Text style={[styles.photosBtnText, { color: colors.primaryInk }]}>
                                {concluidasFotos}/{necessarias} {necessarias === 1 ? 'foto' : 'fotos'}
                              </Text>
                              <AppIcon name="arrowRight" size={14} color={colors.primaryInk} strokeWidth={2.4} />
                            </View>
                          )}
                        </TouchableOpacity>

                        {admin && confirmandoId !== tarefa.id && (
                          <TouchableOpacity
                            onPress={() => setConfirmandoId(tarefa.id)}
                            style={{ marginTop: 4 }}
                          >
                            <Text style={styles.excluir}>Excluir</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Botão de cadastrar tarefa para administradores */}
        {admin && (
          <TouchableOpacity
            style={styles.btnCadastrar}
            activeOpacity={0.85}
            onPress={() => router.push('/nova-tarefa')}
          >
            <AppIcon name="plus" size={18} color="#FFFFFF" strokeWidth={2.6} />
            <Text style={styles.btnCadastrarTexto}>Cadastrar nova tarefa</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Barra de Navegação Flutuante Modular */}
      <BottomNavBar
        activeTab={abaAtiva}
        onTabChange={(tab) => {
          setAbaAtiva(tab);
          if (tab === 'perfil') {
            Alert.alert('Perfil', 'A tela de perfil completa será desenvolvida em breve!');
          } else if (tab === 'ciclo' || tab === 'trocas' || tab === 'ranking') {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroBackground: {
    position: 'absolute',
    top: -400,
    left: 0,
    right: 0,
    height: 870,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  // Topbar
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  housePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    maxWidth: '75%',
  },
  housePillText: {
    fontFamily: 'Sora-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FF7A59',
    borderWidth: 2,
    borderColor: '#3B7BF2',
  },

  // Saudação
  greeting: {
    marginTop: 22,
  },
  greetingSmall: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  greetingName: {
    fontFamily: 'Sora-ExtraBold',
    fontSize: 34,
    lineHeight: 40,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 2,
  },
  greetingSub: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 6,
  },

  // Hero Card com sombra suave
  heroCard: {
    marginTop: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  heroInfo: {
    flex: 1,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrowText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primaryInk,
  },
  heroTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: colors.textDark,
    marginTop: 6,
  },
  heroTitleHighlight: {
    color: colors.primary,
  },
  heroSub: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  ringContainer: {
    width: 76,
    height: 76,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNumber: {
    fontFamily: 'Sora-Bold',
    fontSize: 17,
    lineHeight: 18,
    color: colors.textDark,
  },
  ringSub: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10.5,
    color: colors.textMuted,
  },

  // Stats Grid
  statsGrid: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    fontFamily: 'Sora-Bold',
    fontSize: 22,
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 4,
    minHeight: 28,
  },
  toneBlue: {
    backgroundColor: colors.blueBg,
  },
  toneGreen: {
    backgroundColor: colors.greenBg,
  },
  toneCoral: {
    backgroundColor: colors.coralBg,
  },

  // Seção de Tarefas
  sectionHead: {
    marginTop: 26,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.textDark,
  },
  countPill: {
    height: 26,
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: '#E3ECFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#244F9E',
  },
  diaGrupo: {
    marginTop: 14,
  },
  dayLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12.5,
    letterSpacing: 0.4,
    color: colors.textMuted,
    marginBottom: 8,
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    // Sombreamento suave e sutil
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1.5,
  },
  taskTile: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskBody: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 15.5,
    lineHeight: 20,
    color: colors.textDark,
  },
  taskWhen: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  weightLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: colors.textMuted,
  },
  weightDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 2,
  },
  weightDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D5DEEC',
  },
  weightDotOn: {
    backgroundColor: colors.primary,
  },
  taskSide: {
    alignItems: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  statusBadge: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgePending: {
    backgroundColor: colors.amberBg,
  },
  statusBadgeDone: {
    backgroundColor: colors.greenBg,
  },
  statusText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
  },
  statusTextPending: {
    color: colors.amberFg,
  },
  statusTextDone: {
    color: colors.greenFg,
  },
  photosBtn: {
    paddingVertical: 2,
  },
  photosBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  photosBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12.5,
  },
  excluir: {
    color: '#EF4444',
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
  },
  confirmacao: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.stroke,
  },
  confirmacaoTexto: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: colors.textDark,
    marginBottom: 6,
  },
  confirmacaoBotoes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmacaoBotao: {
    marginRight: 16,
  },
  manter: {
    color: colors.textMuted,
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
  confirmarExclusaoTexto: {
    color: '#EF4444',
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },

  // Estado Vazio
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.textMuted,
  },
  btnCriarVazio: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 20,
    height: 44,
    paddingHorizontal: 18,
  },
  btnCriarVazioTexto: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Botão Cadastrar Nova Tarefa (Admin)
  btnCadastrar: {
    marginTop: 20,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 3,
  },
  btnCadastrarTexto: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  // Faixa de Erro
  faixaErro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  faixaErroTexto: {
    color: '#EF4444',
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    flex: 1,
    paddingRight: 10,
  },
  faixaErroFechar: {
    color: '#EF4444',
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
  },

  // Estilos de Onboarding / Sem moradia
  bemVindoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  bemVindoTitulo: {
    fontFamily: 'Sora-Bold',
    fontSize: 26,
    color: colors.textDark,
    marginTop: 16,
  },
  bemVindoSub: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  botaoFluxo: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1.5,
  },
  botaoFluxoTitulo: {
    fontFamily: 'Sora-Bold',
    fontSize: 16,
    color: colors.textDark,
    marginBottom: 4,
  },
  botaoFluxoSubtexto: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  sair: {
    marginTop: 16,
    alignItems: 'center',
  },
  sairTexto: {
    color: '#EF4444',
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
  },
});
