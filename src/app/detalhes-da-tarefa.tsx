/**
 * Tela de Detalhes da Tarefa
 * Fiel ao design fornecido no mockup.
 *
 * Regras:
 * - O botão "Finalizar Tarefa" só deve aparecer se o usuário logado for o mesmo associado à tarefa.
 * - Integração completa com Cloudflare R2 (API S3) para upload e visualização das 3 fotos de comprovação.
 * - Edição de fotos via ícone de lápis com substituição no bucket.
 */

import { colors } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import {
  buscarInstanciaPorId,
  concluirInstancia,
  docParaInstancia,
  salvarFotosInstancia,
} from '../services/ciclos';
import { buscarMoradiaPorId } from '../services/moradia';
import { obterUrlVisualizacaoFoto, uploadFotoComprovacao } from '../services/r2Storage';
import { buscarTarefaPorId } from '../services/tarefas';
import { InstanciaTarefa, StatusInstancia } from '../types/ciclo';
import { Tarefa } from '../types/tarefa';

const DESCRICAO_LOUCA =
  'Lavar, secar e guardar toda a louça acumulada do período da janta. ' +
  'Deixar a pia limpa, o ralo desimpedido e passar um pano úmido no fogão.';

const DESCRICAO_PADRAO =
  'Executar todas as atividades relacionadas a esta tarefa com zelo, ' +
  'garantindo o bom convívio e a organização da moradia.';

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
    descricao: DESCRICAO_LOUCA,
  };
}

// ---------------------------------------------------------------------------
// Cabeçalho: Voltar + Título Central + Status Badge (badge só após carregar)
// ---------------------------------------------------------------------------
function CabecalhoDetalhes({ status }: { status?: StatusInstancia }) {
  return (
    <View style={styles.topbar}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.dismissTo('/ciclo');
          }
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="arrow-left" size={20} color="#0B1B33" />
      </TouchableOpacity>

      <Text style={styles.topbarTitle}>Detalhes da Tarefa</Text>

      {status ? (
        <View
          style={[
            styles.statusBadge,
            status === 'concluida'
              ? styles.statusBadgeConcluida
              : status === 'atrasada'
                ? styles.statusBadgeAtrasada
                : styles.statusBadgePendente,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              status === 'concluida'
                ? styles.statusBadgeTextConcluida
                : status === 'atrasada'
                  ? styles.statusBadgeTextAtrasada
                  : styles.statusBadgeTextPendente,
            ]}
          >
            {status === 'concluida' ? 'Finalizado' : status === 'atrasada' ? 'Atrasada' : 'Pendente'}
          </Text>
        </View>
      ) : (
        // Mantém o título centralizado enquanto o badge não aparece
        <View style={styles.backButtonPlaceholder} />
      )}
    </View>
  );
}

export default function DetalhesDaTarefaScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; instanciaId?: string }>();
  const id = params.id || params.instanciaId;

  const { usuario, perfil } = useSessao();
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviandoFotoIndice, setEnviandoFotoIndice] = useState<number | null>(null);

  const [instancia, setInstancia] = useState<InstanciaTarefa | null>(null);
  const [tarefaOrigem, setTarefaOrigem] = useState<Tarefa | null>(null);
  const [moradiaInfo, setMoradiaInfo] = useState<{ nome: string; endereco?: string }>({
    nome: 'Moradia da Luiza',
    endereco: 'Nova Imperatriz',
  });

  // Carrega dados da tarefa / instância
  useEffect(() => {
    let cancelado = false;

    const carregarDados = async () => {
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
                  where('tarefaId', '==', tarefa.id),
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
                  usuarioNome: auth.currentUser?.displayName || 'Morador',
                  status: 'pendente',
                  fotos: tarefa.fotos || [],
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
        if (!cancelado) setCarregando(false);
      }
    };

    carregarDados();

    return () => {
      cancelado = true;
    };
  }, [id]);

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
      return DESCRICAO_LOUCA;
    }
    return DESCRICAO_PADRAO;
  }, [instancia, tarefaOrigem]);

  // Formatação da janela de execução
  const janelaTexto = useMemo(() => {
    if (tarefaOrigem?.janelaAntecedenciaHoras) {
      return `janela ${tarefaOrigem.janelaAntecedenciaHoras}h`;
    }
    return 'janela 18h – 23h';
  }, [tarefaOrigem]);

  // Quantidade de fotos necessárias (sempre 3 fotos)
  const peso = instancia?.tarefaPeso ?? 3;
  const fotosNecessarias = 3;
  const fotosAtuais = instancia?.fotos ?? [];
  const fotosConcluidas = fotosAtuais.filter((f) => Boolean(f)).length;

  // URIs locais para exibição imediata (antes do R2 ser consultado)
  const [fotosUriLocais, setFotosUriLocais] = useState<(string | null)[]>([null, null, null]);

  // Modal de visualização em tela cheia (ativo após tarefa concluída)
  const [fotoVisualizando, setFotoVisualizando] = useState<string | null>(null);

  // Capturar foto da câmera ou escolher da galeria
  const capturarFoto = async (indice: number, origem: 'camera' | 'galeria') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (origem === 'camera') {
        const permissao = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissao.granted) {
          Alert.alert(
            'Permissão necessária',
            'É necessário permitir o acesso à câmera para tirar fotos de comprovação.',
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissao.granted) {
          Alert.alert(
            'Permissão necessária',
            'É necessário permitir o acesso à galeria para anexar fotos de comprovação.',
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const localUri = result.assets[0].uri;

      // Exibe imediatamente via URI local enquanto sobe para o R2
      setFotosUriLocais((prev) => {
        const copia = [...prev];
        copia[indice] = localUri;
        return copia;
      });

      setEnviandoFotoIndice(indice);

      // Upload para o bucket "comprovacoes" no Cloudflare R2 via SigV4 S3
      const { key } = await uploadFotoComprovacao(localUri, {
        moradiaId: instancia?.moradiaId,
        tarefaId: instancia?.tarefaId || instancia?.id || id || 'geral',
        instanciaId: instancia?.id,
        indice,
      });

      // Atualiza o array de fotos (chaves R2) no estado e no Firestore
      const novasFotos = [...(instancia?.fotos || [])];
      while (novasFotos.length <= indice) {
        novasFotos.push('');
      }
      novasFotos[indice] = key;

      if (instancia) {
        await salvarFotosInstancia(instancia.id, novasFotos, instancia.tarefaId);
        setInstancia((prev) => (prev ? { ...prev, fotos: novasFotos } : null));
        // Remove a URI local: a partir daqui, a URL assinada do R2 será usada
        setFotosUriLocais((prev) => {
          const copia = [...prev];
          copia[indice] = null;
          return copia;
        });
      }
    } catch (err: any) {
      // Em caso de erro, remove a preview local
      setFotosUriLocais((prev) => {
        const copia = [...prev];
        copia[indice] = null;
        return copia;
      });
      console.error('Erro no upload de foto para R2:', err);
      Alert.alert(
        'Erro ao enviar foto',
        err?.message || 'Falha ao salvar a imagem no Cloudflare R2.',
      );
    } finally {
      setEnviandoFotoIndice(null);
    }
  };

  // Ação ao pressionar um placeholder de foto (visualizar ou adicionar/substituir)
  const handlePressionarFoto = (indice: number, uriFoto?: string) => {
    const fotoKey = instancia?.fotos?.[indice];
    const uriLocal = fotosUriLocais[indice];
    const urlFinal = uriFoto || uriLocal || (fotoKey ? obterUrlVisualizacaoFoto(fotoKey) : null);

    // Quando a tarefa já está concluída: visualização em tela cheia se houver foto
    if (statusAtual === 'concluida') {
      if (urlFinal) {
        setFotoVisualizando(urlFinal);
      }
      return;
    }

    // Enquanto a tarefa não estiver concluída: apenas o morador responsável pode enviar/alterar
    if (!ehUsuarioAssociado) {
      Alert.alert(
        'Acesso restrito',
        'Apenas o morador responsável pode enviar ou alterar fotos desta tarefa.',
      );
      return;
    }

    const temFoto = Boolean(instancia?.fotos?.[indice]);
    Alert.alert(
      temFoto ? `Substituir Foto ${indice + 1}` : `Adicionar Foto ${indice + 1}`,
      'Escolha como deseja obter a foto:',
      [
        {
          text: 'Tirar Foto',
          onPress: () => capturarFoto(indice, 'camera'),
        },
        {
          text: 'Escolher da Galeria',
          onPress: () => capturarFoto(indice, 'galeria'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
    );
  };

  // Finalizar tarefa (botão sempre acessível para o usuário responsável)
  const handleFinalizarTarefa = async () => {
    if (!instancia) return;

    if (instancia.status === 'concluida') {
      Alert.alert('Tarefa Finalizada', 'Esta tarefa já foi concluída anteriormente.');
      return;
    }

    Alert.alert(
      'Finalizar Tarefa',
      'Deseja registrar e marcar esta tarefa como finalizada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setEnviando(true);
              const fotosAtuaisFinal = instancia.fotos || [];
              if (instancia.id && !instancia.id.startsWith('mock-')) {
                await concluirInstancia(instancia.id, fotosAtuaisFinal);
              }
              setInstancia((prev) => (prev ? { ...prev, status: 'concluida' } : null));
              Alert.alert('Sucesso!', 'Tarefa finalizada com sucesso.', [
                {
                  text: 'OK',
                  onPress: () => {
                    if (router.canGoBack()) router.back();
                  },
                },
              ]);
            } catch (err: any) {
              Alert.alert('Erro ao finalizar tarefa', err?.message || 'Tente novamente.');
            } finally {
              setEnviando(false);
            }
          },
        },
      ],
    );
  };

  // Enquanto carrega, a tela já aparece com o cabeçalho; só o conteúdo espera
  if (carregando) {
    return (
      <View style={styles.screen}>
        <View style={[styles.scrollContent, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          <CabecalhoDetalhes />
        </View>
        <ActivityIndicator color={colors.primary} style={styles.carregandoConteudo} />
      </View>
    );
  }

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
        <CabecalhoDetalhes status={statusAtual} />

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

        {/* Grid de 3 Fotos (Placeholders / Imagens com Lápis de Edição) */}
        <View style={styles.fotosGrid}>
          {[0, 1, 2].map((idx) => {
            const fotoKey = instancia?.fotos?.[idx];
            const temFoto = Boolean(fotoKey);
            const estaEnviando = enviandoFotoIndice === idx;
            const uriLocal = fotosUriLocais[idx];
            // Prioriza: (1) URI local para preview imediato, (2) URL assinada do R2 se já persistida
            const fotoUri = uriLocal || (temFoto ? obterUrlVisualizacaoFoto(fotoKey!) : '');
            const temImagem = Boolean(fotoUri);
            const tarefaConcluida = statusAtual === 'concluida';

            return (
              <TouchableOpacity
                key={idx}
                style={styles.fotoCard}
                activeOpacity={0.8}
                onPress={() => handlePressionarFoto(idx, fotoUri)}
                disabled={estaEnviando || (tarefaConcluida && !temImagem)}
              >
                {estaEnviando ? (
                  <View style={styles.fotoLoadingContainer}>
                    <ActivityIndicator size="small" color="#2B7FFF" />
                    <Text style={styles.fotoLoadingText}>Enviando...</Text>
                  </View>
                ) : temImagem ? (
                  <>
                    <Image
                      source={{ uri: fotoUri }}
                      style={styles.fotoThumb}
                      contentFit="cover"
                      transition={200}
                    />
                    {/* Lápis de edição só aparece enquanto a tarefa não foi concluída */}
                    {!tarefaConcluida && (
                      <View style={styles.editBadge}>
                        <Feather name="edit-2" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <Feather name="camera" size={26} color="#8A98AC" />
                    <Text style={styles.fotoPlaceholderText}>Foto {idx + 1}</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
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

        {/* Botão Finalizar Tarefa: SÓ APARECE SE O USUÁRIO LOGADO FOR O MESMO ASSOCIADO À TASK
            E A TAREFA AINDA NÃO FOI CONCLUÍDA */}
        {ehUsuarioAssociado && statusAtual !== 'concluida' && (
          <TouchableOpacity
            style={[styles.botaoEnviar, enviando && styles.botaoEnviarDesabilitado]}
            activeOpacity={0.85}
            onPress={handleFinalizarTarefa}
            disabled={enviando}
          >
            {enviando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botaoEnviarTexto}>Finalizar Tarefa</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal de visualização de foto em tela cheia (apenas após tarefa concluída) */}
      <Modal
        visible={fotoVisualizando !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFotoVisualizando(null)}
      >
        <View style={styles.modalOverlay}>
          {/* Tocar no fundo fecha o modal */}
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setFotoVisualizando(null)}
          />

          {/* Botão fechar */}
          <TouchableOpacity
            style={[styles.modalFechar, { top: Math.max(insets.top + 12, 48) }]}
            onPress={() => setFotoVisualizando(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Imagem em tela cheia */}
          <Image
            source={{ uri: fotoVisualizando || '' }}
            style={styles.modalImagem}
            contentFit="contain"
            transition={200}
          />
        </View>
      </Modal>
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
  carregandoConteudo: {
    marginTop: 40,
  },
  backButtonPlaceholder: {
    width: 42,
    height: 42,
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
  fotoCard: {
    flex: 1,
    height: 108,
    borderRadius: 20,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  fotoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  editBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2B7FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  fotoLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fotoLoadingText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: '#2B7FFF',
    marginTop: 4,
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

  // Botão Finalizar Tarefa
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

  // Modal de visualização de foto em tela cheia
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalFechar: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalImagem: {
    width: '100%',
    height: '80%',
  },
});
