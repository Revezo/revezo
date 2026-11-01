import { colors } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function EscolherFluxoScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Text style={{ fontSize: 72 }}>🏡</Text>
        </View>

        <Text style={styles.title}>Bem-vindo!</Text>
        <Text style={styles.subtitle}>
          Como deseja começar a organizar as tarefas do seu lar?
        </Text>

        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.75}
          onPress={() => router.push('/criar-moradia')}
        >
          <View style={[styles.iconBg, styles.iconBgBlue]}>
            <Feather name="home" size={22} color={colors.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Criar uma Moradia</Text>
            <Text style={styles.cardSubtitle}>Configure seu lar do zero e convide outros moradores.</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.iconMuted} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.75}
          onPress={() => router.push('/entrar-moradia')}
        >
          <View style={[styles.iconBg, styles.iconBgGreen]}>
            <Feather name="log-in" size={22} color={colors.greenFg} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Entrar com Código</Text>
            <Text style={styles.cardSubtitle}>Já tem um código de convite? Junte-se à sua casa.</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.iconMuted} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.75}
          onPress={() => router.push('/minhas-moradias')}
        >
          <View style={[styles.iconBg, styles.iconBgBlue]}>
            <Feather name="list" size={22} color={colors.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Minhas Moradias</Text>
            <Text style={styles.cardSubtitle}>Acesse e gerencie todas as casas em que você participa.</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.iconMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Revezo®</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    alignItems: 'center',
  },
  imageContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Sora-Bold',
    fontSize: 26,
    color: colors.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
    // Sombreamento suave e elegante
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
    width: '100%',
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgBlue: { backgroundColor: colors.blueBg },
  iconBgGreen: { backgroundColor: colors.greenBg },
  cardTextContainer: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  cardTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 16,
    color: colors.textDark,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: colors.primary,
  },
});
