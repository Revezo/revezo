import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, typography } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label: string;
}

export function Input({ label, style, ...rest }: InputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput 
        style={[styles.input, style]} 
        placeholderTextColor={colors.textGray}
        {...rest} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { ...typography.label, color: colors.textGray, marginBottom: 8, marginLeft: 4 },
  input: {
    ...typography.inputText,
    color: colors.textDark,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
});