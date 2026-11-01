import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/constants/theme';

export type BottomNavTab = 'home' | 'ciclo' | 'trocas' | 'ranking' | 'perfil';

export interface BottomNavBarProps {
  /**
   * Aba atualmente ativa. Padrão: 'home'.
   */
  activeTab?: BottomNavTab;

  /**
   * Callback disparado ao tocar em uma aba.
   */
  onTabChange?: (tab: BottomNavTab) => void;

  /**
   * Inicial do usuário para exibir no avatar (ex: 'J'). Padrão: 'J'.
   */
  userInitial?: string;

  /**
   * Define se o botão de Ranking/Gamificação fica visível. Padrão: true.
   */
  showRanking?: boolean;

  /**
   * Estilo customizado para o container flutuante.
   */
  style?: StyleProp<ViewStyle>;
}

interface NavIconProps {
  name: 'home' | 'ciclo' | 'trocas' | 'ranking';
  color: string;
  size?: number;
  strokeWidth?: number;
}

function NavIcon({ name, color, size = 22, strokeWidth = 2 }: NavIconProps) {
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'ciclo':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="3"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M3 10h18M8 3v4M16 3v4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'trocas':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="m17 4 3 3-3 3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M20 7H8a4 4 0 0 0-4 4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="m7 20-3-3 3-3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M4 17h12a4 4 0 0 0 4-4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'ranking':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle
            cx="12"
            cy="9"
            r="5"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M8.5 13.5 7 21l5-3 5 3-1.5-7.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    default:
      return null;
  }
}

interface TabDef {
  id: BottomNavTab;
  label: string;
  icon?: 'home' | 'ciclo' | 'trocas' | 'ranking';
}

const TABS: TabDef[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'ciclo', label: 'Ciclo', icon: 'ciclo' },
  { id: 'trocas', label: 'Trocas', icon: 'trocas' },
  { id: 'ranking', label: 'Ranking', icon: 'ranking' },
  { id: 'perfil', label: 'Perfil' },
];

export function BottomNavBar({
  activeTab = 'home',
  onTabChange,
  userInitial = 'J',
  showRanking = true,
  style,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(20, insets.bottom + 8);

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === 'ranking' && !showRanking) return false;
    return true;
  });

  return (
    <View
      style={[
        styles.wrapper,
        { bottom: bottomInset },
        style,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.navBar}>
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;

          if (tab.id === 'perfil') {
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabItem,
                  isActive && styles.activeTabItemWithAvatar,
                ]}
                activeOpacity={0.7}
                onPress={() => onTabChange?.(tab.id)}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isActive }}
              >
                <LinearGradient
                  colors={['#8FD0FF', '#2B7FFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarCircle}
                >
                  <Text style={styles.avatarText}>{userInitial.toUpperCase()}</Text>
                </LinearGradient>

                {isActive && (
                  <Text style={styles.activeLabel}>{tab.label}</Text>
                )}
              </TouchableOpacity>
            );
          }

          const iconColor = isActive ? colors.primary : '#5B6B82';
          const strokeWidth = isActive ? 2.4 : 2.0;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, isActive && styles.activeTabItem]}
              activeOpacity={0.7}
              onPress={() => onTabChange?.(tab.id)}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              {tab.icon && (
                <NavIcon
                  name={tab.icon}
                  color={iconColor}
                  size={isActive ? 22 : 22}
                  strokeWidth={strokeWidth}
                />
              )}

              {isActive && (
                <Text style={styles.activeLabel}>{tab.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 99,
  },
  navBar: {
    width: '100%',
    maxWidth: 420,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#DCE6F5',
    // Sombra suave e fluida
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  tabItem: {
    height: 52,
    minWidth: 48,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  activeTabItem: {
    backgroundColor: '#E3EEFF',
    paddingHorizontal: 16,
    gap: 8,
  },
  activeTabItemWithAvatar: {
    backgroundColor: '#E3EEFF',
    paddingLeft: 10,
    paddingRight: 16,
    gap: 8,
  },
  activeLabel: {
    fontFamily: 'Sora-Bold',
    fontSize: 14,
    color: colors.textDark,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Sora-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
