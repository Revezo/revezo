import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, IconName } from '@/components/ui/Icons';
import { colors } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { auth } from '@/firebaseConfig';
import { ehAdministrador } from '@/services/moradia';

type Tom = 'blue' | 'green' | 'amber' | 'violet';

const CORES_DO_TOM: Record<Tom, { bg: string; fg: string }> = {
  blue: { bg: colors.blueBg, fg: colors.blueFg },
  green: { bg: colors.greenBg, fg: colors.greenFg },
  amber: { bg: colors.amberBg, fg: colors.amberFg },
  violet: { bg: colors.violetBg, fg: colors.violetFg },
};

const COR_PERIGO_TEXTO = '#8C3324';

const VERSAO_APP =Constants.expoConfig?.version ?? '1.0.0';

/** Aviso para as opções que ainda serão desenvolvidas. */
function emBreve(titulo: string) {
  Alert.alert(titulo, 'Esta funcionalidade será disponibilizada em breve.');
}

// ---------------------------------------------------------------------------
// Componentes da lista
// ---------------------------------------------------------------------------

function Tile({ icone, tom }: { icone: IconName; tom: Tom }) {
  const { bg, fg } = CORES_DO_TOM[tom];
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <AppIcon name={icone} size={20} color={fg} />
    </View>
  );
}

interface LinhaProps {
  icone: IconName;
  tom: Tom;
  titulo: string;
  subtitulo?: string;
  primeira?: boolean;
  onPress?: () => void;
}

function Linha({ icone, tom, titulo, subtitulo, primeira, onPress }: LinhaProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !primeira && styles.rowDivisor, pressed && styles.rowPressionada]}
      onPress={onPress ?? (() => emBreve(titulo))}
      accessibilityRole="button"
      accessibilityLabel={titulo}
    >
      <Tile icone={icone} tom={tom} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{titulo}</Text>
        {subtitulo && <Text style={styles.rowSub}>{subtitulo}</Text>}
      </View>
      <AppIcon name="chevronRight" size={18} color={colors.iconMuted} strokeWidth={2.2} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { usuario, perfil, carregando } = useSessao();

  // Ainda local: a persistência da gamificação na moradia virá numa próxima etapa
  const [gamificacao, setGamificacao] = useState(true);

  if (carregando) return <View style={styles.container} />;
  // Ao sair da conta, volta para a tela de boas-vindas (criar conta / entrar)
  if (!usuario) return <Redirect href="/boas-vindas" />;
  if (!perfil) return <Redirect href="/" />;

  const admin = ehAdministrador(perfil);
  const nomeExibicao = (perfil.apelido || perfil.nome || 'Morador').trim();
  const inicial = nomeExibicao.charAt(0).toUpperCase();

  const abrirMeuPerfil = () => router.push('/meu-perfil');

  const confirmarSaida = () => {
    Alert.alert('Sair da conta', 'Deseja mesmo sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(48, insets.top + 12) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Degradê do topo: anda junto com o scroll, como na Home */}
        <LinearGradient
          colors={['#4A90FF', '#4A90FF', '#2C70F0', '#3D84FA', '#A9CCFF', '#E3EEFF', colors.background]}
          locations={[0, 0.45, 0.58, 0.7, 0.82, 0.94, 1]}
          style={styles.heroBackground}
          pointerEvents="none"
        />

        {/* Cabeçalho: avatar, nome, papel e moradia */}
        <View style={styles.profileHead}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={['#8FD0FF', colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarBig}
            >
              <Text style={styles.avatarBigText}>{inicial}</Text>
            </LinearGradient>
            <TouchableOpacity
              style={styles.avatarEdit}
              activeOpacity={0.8}
              onPress={() => emBreve('Trocar foto')}
              accessibilityLabel="Trocar foto"
            >
              <AppIcon name="pencil" size={14} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <Text style={styles.nome} numberOfLines={2}>
            {nomeExibicao}
          </Text>

          <View style={styles.chips}>
            <View style={styles.chip}>
              <Text style={[styles.chipText, styles.chipTextForte]}>{admin ? 'Admin' : 'Morador'}</Text>
            </View>
            <View style={[styles.chip, styles.chipMoradia]}>
              <Text style={styles.chipText} numberOfLines={1}>
                {perfil.moradiaNome}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.btnWhite} activeOpacity={0.85} onPress={abrirMeuPerfil}>
            <AppIcon name="pencil" size={16} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.btnWhiteText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>

        {/* Conta */}
        <Text style={[styles.groupLabel, styles.groupLabelPrimeiro]}>CONTA</Text>
        <View style={styles.group}>
          <Linha primeira icone="user" tom="blue" titulo="Meu perfil" onPress={abrirMeuPerfil} />
          <Linha icone="sliders" tom="violet" titulo="Configurações" />
          <Linha icone="bell" tom="amber" titulo="Notificações" />
          <Linha icone="info" tom="green" titulo="Sobre o app" />
        </View>

        {/* Administração (somente admin) */}
        {admin && (
          <>
            <Text style={styles.groupLabel}>ADMINISTRAÇÃO DA MORADIA</Text>
            <View style={styles.group}>
              <Linha
                primeira
                icone="tasks"
                tom="blue"
                titulo="Gestão de tarefas"
                subtitulo="Cadastrar, editar e remover tarefas"
              />
              <Linha
                icone="users"
                tom="green"
                titulo="Gestão de moradores"
                subtitulo="Remover moradores dos próximos sorteios"
              />
              <Linha
                icone="crown"
                tom="amber"
                titulo="Promoção de admin"
                subtitulo="Promover outro morador a administrador"
              />
              <View style={[styles.row, styles.rowDivisor]}>
                <Tile icone="medal" tom="violet" />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Gamificação</Text>
                  <Text style={styles.rowSub}>Pontuação e ranking</Text>
                </View>
                <Switch
                  value={gamificacao}
                  onValueChange={setGamificacao}
                  trackColor={{ false: '#CBD7EA', true: colors.primary }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#CBD7EA"
                  accessibilityLabel="Gamificação"
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.danger, pressed && styles.rowPressionada]}
              onPress={() => emBreve('Encerrar moradia')}
              accessibilityRole="button"
              accessibilityLabel="Encerrar moradia"
            >
              <View style={[styles.tile, styles.dangerTile]}>
                <AppIcon name="alert" size={20} color={colors.coralFg} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, styles.dangerTitle]}>Encerrar moradia</Text>
                <Text style={[styles.rowSub, styles.dangerText]}>Dissolver a moradia permanentemente</Text>
              </View>
              <AppIcon name="chevronRight" size={18} color={COR_PERIGO_TEXTO} strokeWidth={2.2} />
            </Pressable>
          </>
        )}

        <TouchableOpacity style={styles.btnSair} activeOpacity={0.8} onPress={confirmarSaida}>
          <AppIcon name="logout" size={18} color={colors.coralFg} strokeWidth={2.2} />
          <Text style={styles.btnSairText}>Sair</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Revezo v{VERSAO_APP}</Text>
      </ScrollView>
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
    paddingBottom: 130,
  },

  // Cabeçalho
  profileHead: {
    alignItems: 'center',
  },
  avatarWrap: {
    width: 92,
    height: 92,
  },
  avatarBig: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  avatarBigText: {
    fontFamily: 'Sora-ExtraBold',
    fontSize: 36,
    color: '#FFFFFF',
  },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 9,
  },
  nome: {
    marginTop: 14,
    fontFamily: 'Sora-ExtraBold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  chips: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  chip: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
  },
  chipMoradia: {
    flexShrink: 1,
  },
  chipText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  chipTextForte: {
    fontWeight: '800',
  },
  btnWhite: {
    marginTop: 18,
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#143CAA',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnWhiteText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#0B2559',
  },

  // Grupos
  groupLabel: {
    marginTop: 24,
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  groupLabelPrimeiro: {
    marginTop: 34,
  },
  group: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    shadowColor: '#143CAA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowDivisor: {
    borderTopWidth: 1,
    borderTopColor: '#EAF0FA',
  },
  rowPressionada: {
    opacity: 0.7,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14.5,
    color: colors.textDark,
  },
  rowSub: {
    marginTop: 1,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: colors.textMuted,
  },

  // Encerrar moradia
  danger: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F6C9C0',
    backgroundColor: colors.coralBg,
  },
  dangerTile: {
    backgroundColor: '#FFFFFF',
  },
  dangerTitle: {
    color: COR_PERIGO_TEXTO,
    fontWeight: '800',
  },
  dangerText: {
    color: COR_PERIGO_TEXTO,
  },

  // Sair
  btnSair: {
    marginTop: 14,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSairText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14.5,
    color: colors.coralFg,
  },
  version: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: colors.textMuted,
  },
});
