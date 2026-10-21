import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, Spacing, typography } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label: string;
  variant?: 'underline' | 'outline';
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  secureTextEntry,
  variant = 'underline',
  error,
  containerStyle,
  labelStyle,
  style,
  ...rest
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry !== undefined;
  const [isFocused, setIsFocused] = useState(false);

  const isOutline = variant === 'outline';
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text
        style={[
          styles.label,
          isOutline && styles.outlineLabel,
          hasError && styles.labelError,
          labelStyle,
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          isOutline ? styles.outlineContainer : styles.inputContainer,
          !hasError && isFocused && (isOutline ? styles.outlineContainerFocused : styles.inputContainerFocused),
          hasError && (isOutline ? styles.outlineContainerError : styles.inputContainerError),
        ]}
      >
        <TextInput
          style={[isOutline ? styles.outlineInput : styles.input, style]}
          placeholderTextColor={colors.textGray}
          secureTextEntry={isPassword ? !isPasswordVisible : false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Feather
              name={isPasswordVisible ? 'eye' : 'eye-off'}
              size={20}
              color={colors.textGray}
            />
          </TouchableOpacity>
        )}
      </View>
      {hasError ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.three },
  label: { ...typography.label, color: colors.textGray, marginBottom: Spacing.half },
  outlineLabel: {
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  labelError: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.stroke,
  },
  inputContainerFocused: { borderBottomColor: colors.primary },
  inputContainerError: { borderBottomColor: '#EF4444' },
  input: { flex: 1, paddingVertical: 10, ...typography.inputText, color: colors.textDark },
  outlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: 14,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 16,
    height: 52,
  },
  outlineContainerFocused: {
    borderColor: colors.primary,
  },
  outlineContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  outlineInput: {
    flex: 1,
    ...typography.inputText,
    color: colors.textDark,
  },
  iconContainer: { paddingLeft: Spacing.three, paddingVertical: Spacing.two },
  errorText: {
    color: '#EF4444',
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
});
