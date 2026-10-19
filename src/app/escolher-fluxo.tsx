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
          <Text style={{ fontSize: 80 }}>🏡</Text>
          {/* Quando tiver a imagem exportada, troque por: 
              <Image source={require('@/assets/sua-imagem.png')} style={{ width: 120, height: 120 }} /> 
          */}
        </View>

        <Text style={styles.title}>Bem-vindo!</Text>
        <Text style={styles.subtitle}>
          Como deseja começar a organizar as tarefas do seu lar?
        </Text>

        <TouchableOpacity 
          style={styles.card} 
          onPress={() => router.push('/criar-moradia')}
        >
          <View style={[styles.iconBg, styles.iconBgBlue]}>
            <Feather name="home" size={22} color="#3B82F6" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Criar uma Moradia</Text>
            <Text style={styles.cardSubtitle}>Configure seu lar do zero e convide outros moradores.</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textGray} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card} 
          // onPress={() => router.push('/entrar-moradia')} // Descomentar quando criar essa tela
        >
          <View style={[styles.iconBg, styles.iconBgGreen]}>
            <Feather name="log-in" size={22} color="#10B981" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Entrar com Código</Text>
            <Text style={styles.cardSubtitle}>Já tem um código de convite? Junte-se à sua casa.</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textGray} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card} 
          onPress={() => router.push('/minhas-moradias')}
        >
          <View style={[styles.iconBg, styles.iconBgBlue]}>
            <Feather name="list" size={22} color="#3B82F6" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Minhas Moradias</Text>
            <Text style={styles.cardSubtitle}>Acesse e gerencie todas as casas em que você participa.</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textGray} />
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
    paddingTop: 40,
    alignItems: 'center',
  },
  imageContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textGray,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.stroke,
    boxShadow: '0 0 8px rgba(0, 0, 0, 0.02)',
    elevation: 1,
    width: '100%',
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgBlue: { backgroundColor: '#EFF6FF' },
  iconBgGreen: { backgroundColor: '#ECFDF5' },
  cardTextContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textGray,
    lineHeight: 18,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});