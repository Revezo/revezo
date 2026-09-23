import '@/global.css';
import { Platform } from 'react-native';

export const colors = {
  background: '#F8FAFC',
  inputBackground: '#FFFFFF',
  stroke: '#DDE2E8',
  textGray: '#919191',
  textDark: '#00171F',
  textWhite: '#FFFFFF',
  primary: '#2B7FFF',
};

export const typography = {
  title: { fontFamily: 'Sora-Bold', fontSize: 18 },
  label: { fontFamily: 'Manrope-Bold', fontSize: 11 },
  inputText: { fontFamily: 'Manrope-SemiBold', fontSize: 15 },
  buttonText: { fontFamily: 'Manrope-Bold', fontSize: 16 },
  secondary: { fontFamily: 'Manrope-Regular', fontSize: 14 },
  secondaryBold: { fontFamily: 'Manrope-Bold', fontSize: 14 },
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;