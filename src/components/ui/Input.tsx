import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { colors, Spacing, typography } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label: string;
}

export function Input({ label, secureTextEntry, ...rest }: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry !== undefined;
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textGray}
          secureTextEntry={isPassword ? !isPasswordVisible : false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity style={styles.iconContainer} onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            <Feather name={isPasswordVisible ? 'eye' : 'eye-off'} size={20} color={colors.textGray} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.three },
  label: { ...typography.label, color: colors.textGray, marginBottom: Spacing.half },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1.5, borderBottomColor: colors.stroke,
  },
  inputContainerFocused: { borderBottomColor: colors.primary },
  input: { flex: 1, paddingVertical: 10, ...typography.inputText, color: colors.textDark },
  iconContainer: { paddingLeft: Spacing.three, paddingVertical: Spacing.two },
});