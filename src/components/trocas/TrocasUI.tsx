import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppIcon } from '@/components/ui/Icons';
import { colors } from '@/constants/theme';

const DIAS_SEMANA_COMPLETOS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function formatarPrazoTroca(prazo: Date | null): string {
  if (!prazo) return 'Ciclo Atual';
  const agora = new Date();
  const mesmoDia =
    prazo.getDate() === agora.getDate() &&
    prazo.getMonth() === agora.getMonth() &&
    prazo.getFullYear() === agora.getFullYear();
  if (mesmoDia) return 'Hoje';
  return `${DIAS_SEMANA_COMPLETOS[prazo.getDay()]} (Ciclo Atual)`;
}

export function formatarPrazoSeletor(prazo: Date | null): string {
  if (!prazo) return 'Ciclo atual';
  const agora = new Date();
  const mesmoDia =
    prazo.getDate() === agora.getDate() &&
    prazo.getMonth() === agora.getMonth() &&
    prazo.getFullYear() === agora.getFullYear();
  if (mesmoDia) return 'Hoje';
  return DIAS_SEMANA_COMPLETOS[prazo.getDay()] ?? 'Ciclo atual';
}

export function formatarTempoRestanteCiclo(cicloFim: Date | null): string {
  if (!cicloFim) return 'Ciclo atual';
  const diffMs = cicloFim.getTime() - Date.now();
  if (diffMs <= 0) return 'Encerrando';
  const horas = Math.ceil(diffMs / (1000 * 60 * 60));
  if (horas < 24) return `Fecha em ${horas}h`;
  const dias = Math.ceil(horas / 24);
  return dias === 1 ? 'Fecha em 1d' : `Fecha em ${dias}d`;
}

export function TopbarTrocas({
  title,
  onBack,
  onHelp,
}: {
  title: string;
  onBack: () => void;
  onHelp?: () => void;
}) {
  return (
    <View style={styles.topbar}>
      <TouchableOpacity
        style={styles.circleBtn}
        activeOpacity={0.7}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="arrow-left" size={20} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.screenTitle}>{title}</Text>

      {onHelp ? (
        <TouchableOpacity
          style={styles.circleBtn}
          activeOpacity={0.7}
          onPress={onHelp}
          accessibilityRole="button"
          accessibilityLabel="Ajuda"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="help-circle" size={22} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.topbarSpacer} />
      )}
    </View>
  );
}

export function BolinhasPeso({ peso, total = 5 }: { peso: number; total?: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, idx) => {
        const preenchida = idx + 1 <= peso;
        return (
          <View
            key={idx}
            style={[styles.dot, preenchida ? styles.dotFilled : styles.dotEmpty]}
          />
        );
      })}
    </View>
  );
}

export function CardComparacaoTroca({
  labelTopo,
  tituloTopo,
  subtituloTopo,
  labelBaixo,
  tituloBaixo,
  subtituloBaixo,
  pesoBaixo,
}: {
  labelTopo: string;
  tituloTopo: string;
  subtituloTopo: string;
  labelBaixo: string;
  tituloBaixo: string;
  subtituloBaixo: string;
  pesoBaixo: number;
}) {
  return (
    <View style={styles.compCard}>
      <Text style={styles.compLabel}>{labelTopo}</Text>
      <Text style={styles.compTitle}>{tituloTopo}</Text>
      <Text style={styles.compSub}>{subtituloTopo}</Text>

      <View style={styles.swapDividerRow}>
        <View style={styles.swapDividerLine} />
        <View style={styles.swapIconBadge}>
          <AppIcon name="swap" size={16} color={colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.swapDividerLine} />
      </View>

      <Text style={styles.compLabel}>{labelBaixo}</Text>
      <View style={styles.compBottomTitleRow}>
        <Text style={styles.compTitleBlue}>{tituloBaixo}</Text>
        <BolinhasPeso peso={pesoBaixo} />
      </View>
      <Text style={styles.compSub}>{subtituloBaixo}</Text>
    </View>
  );
}

export function TelaSucessoTroca({
  titulo,
  subtitulo,
  resumoTitulo,
  labelMais,
  valorMais,
  labelMenos,
  valorMenos,
  onVoltar,
}: {
  titulo: string;
  subtitulo: string;
  resumoTitulo: string;
  labelMais: string;
  valorMais: string;
  labelMenos: string;
  valorMenos: string;
  onVoltar: () => void;
}) {
  return (
    <View style={styles.successWrap}>
      <View style={styles.successIconCircle}>
        <Feather name="check" size={34} color={colors.greenFg} />
      </View>

      <Text style={styles.successTitle}>{titulo}</Text>
      <Text style={styles.successSub}>{subtitulo}</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryHeader}>{resumoTitulo}</Text>

        <View style={styles.summaryRow}>
          <View style={[styles.summarySignCircle, styles.summaryPlusBg]}>
            <Text style={styles.summaryPlusText}>+</Text>
          </View>
          <View style={styles.summaryTextCol}>
            <Text style={styles.summaryItemLabel}>{labelMais}</Text>
            <Text style={styles.summaryItemValue}>{valorMais}</Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <View style={[styles.summarySignCircle, styles.summaryMinusBg]}>
            <Text style={styles.summaryMinusText}>-</Text>
          </View>
          <View style={styles.summaryTextCol}>
            <Text style={styles.summaryItemLabel}>{labelMenos}</Text>
            <Text style={styles.summaryItemValueMuted}>{valorMenos}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={onVoltar}>
        <Text style={styles.primaryBtnText}>Voltar para Trocas</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarSpacer: {
    width: 42,
    height: 42,
  },
  screenTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 20,
    color: colors.textDark,
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
  dotEmpty: {
    backgroundColor: '#DCE4EE',
  },

  compCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EBF0F6',
    marginBottom: 18,
    shadowColor: '#0B1B33',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  compLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    letterSpacing: 0.7,
    color: '#8A98AC',
    marginBottom: 6,
  },
  compTitle: {
    fontFamily: 'Sora-Bold',
    fontSize: 19,
    color: colors.textDark,
    marginBottom: 4,
  },
  compBottomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  compTitleBlue: {
    fontFamily: 'Sora-Bold',
    fontSize: 18,
    color: colors.primary,
  },
  compSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13.5,
    color: '#7B8BA3',
  },
  swapDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  swapDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEF2F7',
  },
  swapIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DCE8FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },

  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingBottom: 110,
  },
  successIconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  successTitle: {
    fontFamily: 'Sora-ExtraBold',
    fontSize: 24,
    color: colors.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  successSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    color: '#7B8BA3',
    textAlign: 'center',
    marginBottom: 26,
    paddingHorizontal: 12,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EBF0F6',
    marginBottom: 28,
  },
  summaryHeader: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11.5,
    letterSpacing: 0.7,
    color: '#8A98AC',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  summarySignCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryPlusBg: {
    backgroundColor: '#DCFCE7',
  },
  summaryPlusText: {
    fontFamily: 'Sora-Bold',
    fontSize: 16,
    color: colors.greenFg,
  },
  summaryMinusBg: {
    backgroundColor: '#FEE2E2',
  },
  summaryMinusText: {
    fontFamily: 'Sora-Bold',
    fontSize: 17,
    color: '#DC2626',
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryItemLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    letterSpacing: 0.6,
    color: '#8A98AC',
    marginBottom: 2,
  },
  summaryItemValue: {
    fontFamily: 'Sora-Bold',
    fontSize: 16.5,
    color: colors.textDark,
  },
  summaryItemValueMuted: {
    fontFamily: 'Sora-Bold',
    fontSize: 16.5,
    color: '#64748B',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#EEF2F7',
    marginVertical: 14,
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: 'Sora-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
