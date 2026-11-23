import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/Icons';
import { colors } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { atualizarNomeEApelido, solicitarTrocaDeEmail } from '@/services/perfil';

// ---------------------------------------------------------------------------
// Campo do formulário
// ---------------------------------------------------------------------------

interface CampoProps extends TextInputProps {
  label: string;
  dica?: string;
  /** Conteúdo extra à direita do rótulo (ex.: chip da moradia). */
  extra?: React.ReactNode;
}

function Campo({ label, dica, extra, style, ...rest }: CampoProps) {
  const [focado, setFocado] = useState(false);

  return (
    <View style={styles.campo}>
      <View style={styles.campoLabelRow}>
        <Text style={styles.campoLabel}>{label}</Text>
        {extra}
      </View>
      <TextInput
        style={[styles.input, focado && styles.inputFocado, style]}
        placeholderTextColor={colors.iconMuted}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        accessibilityLabel={label}
        {...rest}
      />
      {dica && <Text style={styles.dica}>{dica}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

export default function MeuPerfilScreen() {
  const insets = useSafeAreaInsets();
  const { usuario, perfil, recarregarPerfil } = useSessao();

  // Valores salvos (acompanham o perfil quando ele é recarregado)
  const nomeSalvo = perfil?.nomeCadastro || perfil?.nome || '';
  const apelidoSalvo = perfil?.apelido ?? '';
  const emailSalvo = usuario?.email ?? '';

  const [nome, setNome] = useState(nomeSalvo);
  const [apelido, setApelido] = useState(apelidoSalvo);
  const [email, setEmail] = useState(emailSalvo);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!usuario) return <Redirect href="/boas-vindas" />;
  if (!perfil) return <Redirect href="/" />;

  const nomeMudou = nome.trim() !== nomeSalvo.trim();
  const apelidoMudou = apelido.trim() !== apelidoSalvo.trim();
  const emailMudou = email.trim().toLowerCase() !== emailSalvo.toLowerCase();
  const temAlteracoes = nomeMudou || apelidoMudou || emailMudou;

  const inicial = (apelido.trim() || nome.trim() || perfil.nome || 'M').charAt(0).toUpperCase();

  const voltar = () => {
    if (router.canGoBack()) router.back();
    else router.dismissTo('/perfil');
  };

  const salvar = async () => {
    if (!temAlteracoes || salvando) return;
    setErro(null);
    setSalvando(true);
    try {
      if (nomeMudou || apelidoMudou) {
        await atualizarNomeEApelido(usuario, perfil.moradiaId, { nome, apelido });
        await recarregarPerfil();
      }
      if (emailMudou) {
        await solicitarTrocaDeEmail(usuario, email);
        Alert.alert(
          'Confirme seu novo e-mail',
          `Enviamos um link de confirmação para ${email.trim()}. ` +
            'O e-mail da conta só muda depois que você abrir o link.',
          [{ text: 'OK', onPress: voltar }],
        );
      } else {
        voltar();
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(48, insets.top + 12) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={24}
      >
        {/* Degradê do topo: anda junto com o scroll */}
        <LinearGradient
          colors={['#4A90FF', '#4A90FF', '#2C70F0', '#3D84FA', '#A9CCFF', '#E3EEFF', colors.background]}
          locations={[0, 0.45, 0.56, 0.66, 0.8, 0.92, 1]}
          style={styles.heroBackground}
          pointerEvents="none"
        />

        {/* Barra superior */}
        <View style={styles.topbar}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={voltar}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <AppIcon name="arrowLeft" size={20} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.topbarTitle}>Meu perfil</Text>
          <View style={styles.topbarPlaceholder} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarArea}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={['#8FD0FF', colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{inicial}</Text>
            </LinearGradient>
            <TouchableOpacity
              style={styles.avatarCamera}
              activeOpacity={0.8}
              onPress={avisarTrocaDeFoto}
              accessibilityLabel="Trocar foto"
            >
              <AppIcon name="camera" size={16} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnTrocarFoto} activeOpacity={0.85} onPress={avisarTrocaDeFoto}>
            <AppIcon name="pencil" size={15} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.btnTrocarFotoText}>Trocar foto</Text>
          </TouchableOpacity>
        </View>

        {/* Formulário */}
        <View style={styles.card}>
          <Campo
            label="NOME COMPLETO"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome completo"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            editable={!salvando}
          />

          <Campo
            label="APELIDO NESTA MORADIA"
            extra={
              <View style={styles.chipMoradia}>
                <Text style={styles.chipMoradiaText} numberOfLines={1}>
                  {perfil.moradiaNome}
                </Text>
              </View>
            }
            dica="Visível só para esta moradia."
            value={apelido}
            onChangeText={setApelido}
            placeholder="Como a casa te chama"
            autoCapitalize="words"
            returnKeyType="next"
            editable={!salvando}
          />

          <Campo
            label="E-MAIL"
            dica="Enviaremos um link de confirmação."
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            onSubmitEditing={salvar}
            editable={!salvando}
          />
        </View>

        {erro && (
          <View style={styles.faixaErro}>
            <AppIcon name="alert" size={16} color={colors.coralFg} strokeWidth={2.2} />
            <Text style={styles.faixaErroTexto}>{erro}</Text>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Botão fixo no rodapé */}
      <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <TouchableOpacity
          style={[styles.btnSalvar, (!temAlteracoes || salvando) && styles.btnSalvarDesabilitado]}
          activeOpacity={0.85}
          onPress={salvar}
          disabled={!temAlteracoes || salvando}
          accessibilityRole="button"
          accessibilityState={{ disabled: !temAlteracoes || salvando, busy: salvando }}
        >
          {salvando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnSalvarText}>Salvar alterações</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function avisarTrocaDeFoto() {
  Alert.alert('Trocar foto', 'Esta funcionalidade será disponibilizada em breve.');
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
    height: 780,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Barra superior
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarTitle: {
    fontFamily: 'Sora-ExtraBold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  topbarPlaceholder: {
    width: 40,
  },

  // Avatar
  avatarArea: {
    marginTop: 18,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 112,
    height: 112,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  avatarText: {
    fontFamily: 'Sora-ExtraBold',
    fontSize: 44,
    color: '#FFFFFF',
  },
  avatarCamera: {
    position: 'absolute',
    right: -2,
    bottom: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 9,
  },
  btnTrocarFoto: {
    marginTop: 14,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#143CAA',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnTrocarFotoText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#0B2559',
  },

  // Formulário
  card: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 6,
    shadowColor: '#143CAA',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
  },
  campo: {
    marginBottom: 16,
  },
  campoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  campoLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F7FAFF',
    paddingHorizontal: 16,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 15.5,
    color: colors.textDark,
  },
  inputFocado: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  dica: {
    marginTop: 6,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: colors.textMuted,
  },
  chipMoradia: {
    flexShrink: 1,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.blueBg,
    justifyContent: 'center',
  },
  chipMoradiaText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: colors.primaryInk,
  },

  // Erro
  faixaErro: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F6C9C0',
    backgroundColor: colors.coralBg,
  },
  faixaErroTexto: {
    flex: 1,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#8C3324',
  },

  // Rodapé
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  btnSalvar: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  btnSalvarDesabilitado: {
    opacity: 0.55,
  },
  btnSalvarText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
