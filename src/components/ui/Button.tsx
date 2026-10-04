import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { colors, typography } from '../../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  isLoading?: boolean;
}

export function Button({ title, isLoading, style, disabled, ...rest }: ButtonProps) {
  return (
    <TouchableOpacity 
      style={[styles.button, (disabled || isLoading) && styles.disabled, style]} 
      activeOpacity={0.8} 
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.textWhite} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  disabled: { opacity: 0.7 },
  text: { ...typography.buttonText, color: colors.textWhite },
});