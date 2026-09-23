import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, typography } from '../../constants/theme';

export function Header({ title, showBack = true }: { title: string; showBack?: boolean }) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={colors.textDark} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, marginTop: 16 },
  backButton: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.stroke,
    backgroundColor: colors.inputBackground, justifyContent: 'center', alignItems: 'center',
  },
  title: { ...typography.title, color: colors.textDark },
  placeholder: { width: 40 },
});