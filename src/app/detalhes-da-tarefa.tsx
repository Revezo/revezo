/**
 * Tela de Detalhes da Tarefa
 * Fiel ao design fornecido no mockup.
 *
 * Regras:
 * - O botão "Enviar Comprovação" só deve aparecer se o usuário logado for o mesmo associado à tarefa.
 * - As imagens permanecem como placeholder até a integração da API de fotos.
 */

import { BottomNavBar, BottomNavTab } from '@/components/navigation/BottomNavBar';
import { colors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { buscarInstanciaPorId, concluirInstancia, docParaInstancia } from '../services/ciclos';
import { buscarMoradiaPorId, carregarPerfil, PerfilUsuario } from '../services/moradia';
import { buscarTarefaPorId } from '../services/tarefas';
import { InstanciaTarefa, StatusInstancia } from '../types/ciclo';
import { Tarefa } from '../types/tarefa';

// ---------------------------------------------------------------------------
// Mock padrão para preview quando nenhum ID for passado via rota
// ---------------------------------------------------------------------------
function criarMockInstancia(usuarioAtualId?: string): InstanciaTarefa {
  return {
    id: 'mock-louca',
    cicloId: 'mock-ciclo-1',
    numeroCiclo: 1,
    tarefaId: 'mock-tarefa-louca',
    tarefaNome: 'Louça da cozinha',
    tarefaPeso: 3,
    moradiaId: 'mock-moradia',
    usuarioId: usuarioAtualId || 'mock-user-owner',
    usuarioNome: 'Luiza',
    status: 'pendente',
    fotos: [],
    atribuidaEm: new Date(),
    concluidaEm: null,
    prazoFim: new Date(),
    descricao:
      'Lavar, secar e guardar toda a louça acumulada do período da janta. Deixar a pia limpa, o ralo desimpedido e passar um pano úmido no fogão.',
  };
}

export default function DetalhesDaTarefaScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; instanciaId?: string }>();
  const id = params.id || params.instanciaId;

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<BottomNavTab>('ciclo');

  const [instancia, setInstancia] = useState<InstanciaTarefa | null>(null);
  const [tarefaOrigem, setTarefaOrigem] = useState<Tarefa | null>(null);
  const [moradiaInfo, setMoradiaInfo] = useState<{ nome: string; endereco?: string }>({
    nome: 'Moradia da Luiza',
    endereco: 'Nova Imperatriz',
  });

  // Escuta autenticação
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUsuario(u);
      if (u) {
        try {
          const p = await carregarPerfil(u);
          setPerfil(p);
        } catch {
          setPerfil(null);
        }
      } else {
        setPerfil(null);
      }
    });
  }, []);

  // Carrega dados da tarefa / instância
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      if (id) {
        let item = await buscarInstanciaPorId(id);

        if (!item) {
          // Se não encontrou como instância, pode ser uma Tarefa vinda da Home
          const tarefa = await buscarTarefaPorId(id);
          if (tarefa) {
            setTarefaOrigem(tarefa);

            // Tenta localizar se já existe uma instância dessa tarefa no ciclo ativo
            let instanciaVinculada: InstanciaTarefa | null = null;
            try {
              const qInst = query(
                collection(db, 'instancias_tarefa'),
                where('moradiaId', '==', tarefa.moradiaId),
                where('tarefaId', '==', tarefa.id)
              );
              const instSnap = await getDocs(qInst);
              if (!instSnap.empty) {
                const lista = instSnap.docs.map((d) => docParaInstancia(d.id, d.data()));
                lista.sort((a, b) => b.atribuidaEm.getTime() - a.atribuidaEm.getTime());
                instanciaVinculada = lista[0];
              }
            } catch (errInst) {
              console.warn('Erro ao consultar instância por tarefaId:', errInst);
            }

            if (instanciaVinculada) {
              item = instanciaVinculada;
            } else {
              item = {
                id: tarefa.id,
                cicloId: '',
                numeroCiclo: 1,
                tarefaId: tarefa.id,
                tarefaNome: tarefa.nome,
                tarefaPeso: tarefa.pesoDificuldade,
                moradiaId: tarefa.moradiaId,
                usuarioId: tarefa.criadaPor || auth.currentUser?.uid || '',
                usuarioNome: perfil?.nome || 'Morador',
                status: 'pendente',
                fotos: [],
                atribuidaEm: tarefa.criadaEm || new Date(),
                concluidaEm: null,
                prazoFim: null,
                descricao: tarefa.descricao,
              };
            }
          }
        }

        if (item) {
          setInstancia(item);

          // Busca detalhes da moradia
          if (item.moradiaId) {
            const m = await buscarMoradiaPorId(item.moradiaId);
            if (m) {
              setMoradiaInfo({
                nome: m.nome,
                endereco: m.endereco || '',
              });
            }
          }

          // Busca tarefa de origem para obter descrição e janela adicionais, se houver
          if (item.tarefaId) {
            const t = await buscarTarefaPorId(item.tarefaId);
            if (t) setTarefaOrigem(t);
          }
        } else {
          // Se não encontrou no Firestore, usa o mock padrão
          setInstancia(criarMockInstancia(auth.currentUser?.uid));
        }
      } else {
        // Sem ID na rota: usa o mock do mockup
        setInstancia(criarMockInstancia(auth.currentUser?.uid));
      }
    } catch (e) {
      console.warn('Erro ao carregar detalhes da tarefa:', e);
      setInstancia(criarMockInstancia(auth.currentUser?.uid));
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Regra fundamental: botão só aparece se usuário logado for o mesmo associado à task
  const ehUsuarioAssociado = useMemo(() => {
    if (!usuario || !instancia) return false;
    return usuario.uid === instancia.usuarioId;
  }, [usuario, instancia]);

  // Subtítulo da moradia (ex: "Moradia da Luiza, Nova Imperatriz")
  const subtituloMoradia = useMemo(() => {
    const nome = moradiaInfo.nome || perfil?.moradiaNome || 'Moradia da Luiza';
    const end = moradiaInfo.endereco?.trim() || 'Nova Imperatriz';
    return end ? `${nome}, ${end}` : nome;
  }, [moradiaInfo, perfil]);

  // Descrição da tarefa
  const descricaoExibida = useMemo(() => {
    if (instancia?.descricao) return instancia.descricao;
    if (tarefaOrigem?.descricao) return tarefaOrigem.descricao;
    if (instancia?.tarefaNome.toLowerCase().includes('louça')) {
      return 'Lavar, secar e guardar toda a louça acumulada do período da janta. Deixar a pia limpa, o ralo desimpedido e passar um pano úmido no fogão.';
    }
    return 'Executar todas as atividades relacionadas a esta tarefa com zelo, garantindo o bom convívio e a organização da moradia.';
  }, [instancia, tarefaOrigem]);

  // Formatação da janela de execução
  const janelaTexto = useMemo(() => {
    if (tarefaOrigem?.janelaAntecedenciaHoras) {
      return `janela ${tarefaOrigem.janelaAntecedenciaHoras}h`;
    }
    return 'janela 18h – 23h';
  }, [tarefaOrigem]);

  // Quantidade de fotos necessárias
  const peso = instancia?.tarefaPeso ?? 3;
  const fotosNecessarias = 3;
  const fotosConcluidas = instancia?.fotos?.length ?? 0;

  // Ação ao pressionar um placeholder de foto
  const handlePressionarFoto = (numeroFoto: number) => {
    Alert.alert(
      `Foto ${numeroFoto}`,
      'A funcionalidade de envio e captura de fotos será integrada com a API em breve. No momento as fotos estão como placeholder.',
      [{ text: 'Entendido' }],
    );
  };

  // Enviar comprovação
  const handleEnviarComprovacao = async () => {
    if (!instancia) return;

    if (instancia.status === 'concluida') {
      Alert.alert('Tarefa Concluída', 'Esta comprovação já foi enviada e a tarefa está finalizada.');
      return;
    }

    Alert.alert(
      'Enviar Comprovação',
      'As fotos estão em modo placeholder (aguardando API). Deseja registrar a comprovação e marcar esta tarefa como finalizada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Envio',
          onPress: async () => {
            try {
              setEnviando(true);
              if (instancia.id && !instancia.id.startsWith('mock-')) {
                await concluirInstancia(instancia.id, []);
              }
              setInstancia((prev) => (prev ? { ...prev, status: 'concluida' } : null));
              Alert.alert('Sucesso!', 'Comprovação registrada com sucesso.', [
                {
                  text: 'OK',
                  onPress: () => {
                    if (router.canGoBack()) router.back();
                  },
                },
              ]);
            } catch (err: any) {
              Alert.alert('Erro ao enviar comprovação', err?.message || 'Tente novamente.');
            } finally {
              setEnviando(false);
            }
          },
        },
      ],
    );
  };

  if (carregando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const inicialUsuario = (perfil?.apelido || perfil?.nome || 'M').charAt(0).toUpperCase();
  const statusAtual: StatusInstancia = instancia?.status ?? 'pendente';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: 130 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Topbar: Voltar + Título Central + Status Badge */}
        <View style={styles.topbar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/ciclo');
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={20} color="#0B1B33" />
          </TouchableOpacity>

          <Text style={styles.topbarTitle}>Detalhes da Tarefa</Text>

          {/* Badge de Status na Topbar */}
          <View
            style={[
              styles.statusBadge,
              statusAtual === 'concluida'
                ? styles.statusBadgeConcluida
                : statusAtual === 'atrasada'
                  ? styles.statusBadgeAtrasada
                  : styles.statusBadgePendente,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                statusAtual === 'concluida'
                  ? styles.statusBadgeTextConcluida
                  : statusAtual === 'atrasada'
                    ? styles.statusBadgeTextAtrasada
                    : styles.statusBadgeTextPendente,
              ]}
            >
              {statusAtual === 'concluida'
                ? 'Finalizado'
                : statusAtual === 'atrasada'
                  ? 'Atrasada'
                  : 'Pendente'}
            </Text>
          </View>
        </View>

        {/* Card Principal de Detalhes da Tarefa */}
        <View style={styles.mainCard}>
          <Text style={styles.cardTitle}>{instancia?.tarefaNome || 'Louça da cozinha'}</Text>
          <Text style={styles.cardSubtitle}>{subtituloMoradia}</Text>

          <Text style={styles.cardDescription}>{descricaoExibida}</Text>

          {/* Rodapé do Card: Peso (dots) e Janela (relógio) */}
          <View style={styles.cardFooterRow}>
            <View style={styles.pesoRow}>
              <Text style={styles.pesoLabel}>Peso</Text>
              <View style={styles.dotsContainer}>
                {[1, 2, 3, 4].map((idx) => {
                  const preenchida = idx <= peso;
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

            <View style={styles.janelaRow}>
              <Feather name="clock" size={15} color="#8A98AC" />
              <Text style={styles.janelaText}>{janelaTexto}</Text>
            </View>
          </View>
        </View>

        {/* Cabeçalho da Seção de Comprovação */}
        <View style={styles.comprovacaoHeaderRow}>
          <Text style={styles.comprovacaoSectionTitle}>
            COMPROVAÇÃO ({fotosNecessarias} FOTOS)
          </Text>
          <Text style={styles.comprovacaoCount}>
            {fotosConcluidas}/{fotosNecessarias}
          </Text>
        </View>

        {/* Grid de 3 Fotos Placeholder */}
        <View style={styles.fotosGrid}>
          {[1, 2, 3].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.fotoPlaceholderCard}
              activeOpacity={0.7}
              onPress={() => handlePressionarFoto(num)}
            >
              <Feather name="camera" size={26} color="#8A98AC" />
              <Text style={styles.fotoPlaceholderText}>Foto {num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner Informativo de Contestação */}
        <View style={styles.avisoCard}>
          <View style={styles.avisoIconContainer}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M12 8v4M12 16h.01"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text style={styles.avisoText}>
            As fotos ficam disponíveis para consulta em caso de contestação após o encerramento da
            tarefa.
          </Text>
        </View>

        {/* Botão Enviar Comprovação: SÓ APARECE SE O USUÁRIO LOGADO FOR O MESMO ASSOCIADO À TASK */}
        {ehUsuarioAssociado && (
          <TouchableOpacity
            style={[
              styles.botaoEnviar,
              (enviando || statusAtual === 'concluida') && styles.botaoEnviarDesabilitado,
            ]}
            activeOpacity={0.85}
            onPress={handleEnviarComprovacao}
            disabled={enviando || statusAtual === 'concluida'}
          >
            {enviando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botaoEnviarTexto}>
                {statusAtual === 'concluida' ? 'Comprovação Enviada' : 'Enviar Comprovação'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Barra de Navegação Inferior */}
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
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FD',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FD',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Topbar
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 18,
    color: '#0B1B33',
    textAlign: 'center',
  },

  // Badge de Status no cabeçalho
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgePendente: {
    backgroundColor: '#FFF2D6',
  },
  statusBadgeConcluida: {
    backgroundColor: '#E6F9EE',
  },
  statusBadgeAtrasada: {
    backgroundColor: '#FEECEB',
  },
  statusBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
  statusBadgeTextPendente: {
    color: '#D97706',
  },
  statusBadgeTextConcluida: {
    color: '#18A957',
  },
  statusBadgeTextAtrasada: {
    color: '#EA4335',
  },

  // Card Principal de Detalhes
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  cardTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 22,
    color: '#0B1B33',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13.5,
    color: '#8A98AC',
    marginTop: 6,
  },
  cardDescription: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14.5,
    lineHeight: 22,
    color: '#334155',
    marginTop: 16,
    marginBottom: 22,
  },

  // Rodapé do Card
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pesoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pesoLabel: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13.5,
    color: '#8A98AC',
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
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
    backgroundColor: '#E2E8F0',
  },
  janelaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  janelaText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#7B8BA3',
  },

  // Seção Comprovação
  comprovacaoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  comprovacaoSectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    letterSpacing: 0.6,
    color: '#8A98AC',
  },
  comprovacaoCount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#8A98AC',
  },

  // Grid de Fotos
  fotosGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fotoPlaceholderCard: {
    flex: 1,
    height: 108,
    borderRadius: 20,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoPlaceholderText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#7B8BA3',
    marginTop: 8,
  },

  // Banner Informativo
  avisoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avisoIconContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoText: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: '#8A98AC',
  },

  // Botão Enviar Comprovação
  botaoEnviar: {
    backgroundColor: '#2B7FFF',
    height: 54,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2B7FFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  botaoEnviarDesabilitado: {
    opacity: 0.7,
  },
  botaoEnviarTexto: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
