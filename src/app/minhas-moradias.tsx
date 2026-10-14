import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Header } from '@/components/ui/Header';
import { colors } from '@/constants/theme';
import { auth } from '@/firebaseConfig';
import { alterarMoradiaAtiva, buscarMinhasMoradias, MoradiaResumo } from '@/services/moradia';

export default function MinhasMoradiasScreen() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [adminMoradias, setAdminMoradias] = useState<MoradiaResumo[]>([]);
  const [participaMoradias, setParticipaMoradias] = useState<MoradiaResumo[]>([]);
  const [entrandoId, setEntrandoId] = useState<string | null>(null);

  async function handleEntrarMoradia(moradiaId: string) {
    if (!auth.currentUser) return;
    
    setEntrandoId(moradiaId);
    try {
      await alterarMoradiaAtiva(auth.currentUser.uid, moradiaId);
      
      router.push('/');
    } catch {
      Alert.alert('Erro', 'Não foi possível acessar a moradia.');
      setEntrandoId(null);
    }
  }

  useEffect(() => {
    async function carregar() {
      if (!auth.currentUser) return;
      try {
        const { administra, participa } = await buscarMinhasMoradias(auth.currentUser.uid);
        setAdminMoradias(administra);
        setParticipaMoradias(participa);
      } catch {
        Alert.alert('Erro', 'Não foi possível carregar suas moradias.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const totalMoradias = adminMoradias.length + participaMoradias.length;

  const renderCard = (moradia: MoradiaResumo, isAdmin: boolean) => (
    <TouchableOpacity 
      key={moradia.id} 
      style={styles.card}
      onPress={() => handleEntrarMoradia(moradia.id)}
      disabled={entrandoId !== null}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, isAdmin ? styles.iconBgAdmin : styles.iconBgMorador]}>
          <Feather name="home" size={20} color={isAdmin ? '#3B82F6' : '#10B981'} />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{moradia.nome}</Text>
          <Text style={styles.cardAddress}>
            {moradia.endereco || 'Endereço não informado'}
          </Text>
        </View>
        
        {entrandoId === moradia.id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="chevron-right" size={20} color={colors.textGray} />
        )}

      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.badge, isAdmin ? styles.badgeAdmin : styles.badgeMorador]}>
          <Text style={[styles.badgeText, isAdmin ? styles.badgeTextAdmin : styles.badgeTextMorador]}>
            {isAdmin ? 'Administrador' : 'Morador'}
          </Text>
        </View>
        <View style={styles.membersContainer}>
          <Feather name="users" size={14} color={colors.textGray} />
          <Text style={styles.membersText}>
            {moradia.totalMoradores} {moradia.totalMoradores === 1 ? 'morador' : 'moradores'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Minhas Moradias" />

      {carregando ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.totalText}>{totalMoradias} moradias no total</Text>

          {adminMoradias.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Você administra</Text>
                  <Text style={styles.sectionSubtitle}>Gerencie as tarefas e os moradores.</Text>
                </View>
                <Text style={styles.sectionCount}>{adminMoradias.length} moradias</Text>
              </View>
              {adminMoradias.map(m => renderCard(m, true))}
            </View>
          )}

          {participaMoradias.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Você participa</Text>
                  <Text style={styles.sectionSubtitle}>Colabore com as tarefas da casa.</Text>
                </View>
                <Text style={styles.sectionCount}>{participaMoradias.length} moradias</Text>
              </View>
              {participaMoradias.map(m => renderCard(m, false))}
            </View>
          )}

        </ScrollView>
      )}

      {!carregando && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/escolher-fluxo')}
          >
            <Text style={styles.actionButtonText}>Criar ou entrar em outra moradia</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 100 },
  totalText: { color: '#3B82F6', fontSize: 13, fontWeight: '600', marginBottom: 24 },
  
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: colors.textGray },
  sectionCount: { fontSize: 13, color: colors.textGray },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.stroke,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBg: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconBgAdmin: { backgroundColor: '#EFF6FF' }, 
  iconBgMorador: { backgroundColor: '#ECFDF5' }, 
  cardTextContainer: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  cardAddress: { fontSize: 13, color: colors.textGray },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeAdmin: { backgroundColor: '#DBEAFE' },
  badgeMorador: { backgroundColor: '#D1FAE5' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextAdmin: { color: '#2563EB' },
  badgeTextMorador: { color: '#059669' },
  
  membersContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  membersText: { fontSize: 13, color: colors.textGray },

  footer: {
    padding: 24,
    paddingBottom: 40,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.stroke,
  },
  actionButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 24, 
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6', 
  }
});