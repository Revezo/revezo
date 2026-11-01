import '@/global.css';
import { Platform } from 'react-native';

export const colors = {
  background: '#F4F7FD',
  bg: '#F4F7FD',
  surface: '#FFFFFF',
  inputBackground: '#FFFFFF',
  stroke: '#DDE2E8',
  line: '#E3EBF7',
  navBorder: '#DCE6F5',
  textGray: '#919191',
  textDark: '#0B1B33',
  text: '#0B1B33',
  textMuted: '#53647C',
  iconMuted: '#7B8BA3',
  textWhite: '#FFFFFF',
  primary: '#2B7FFF',
  primaryInk: '#1D5FD1',

  // Tons de destaque
  blueBg: '#E6F0FF',
  blueFg: '#1D5FD1',
  greenBg: '#E1F5E9',
  greenFg: '#11763F',
  coralBg: '#FDE8E3',
  coralFg: '#B4412F',
  amberBg: '#FFF0D1',
  amberFg: '#7A4A00',
  violetBg: '#EDE9FE',
  violetFg: '#5B3FC4',
};

export const typography = {
  title: { fontFamily: 'Sora-Bold', fontSize: 18 },
  titleExtraBold: { fontFamily: 'Sora-ExtraBold', fontSize: 18 },
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
