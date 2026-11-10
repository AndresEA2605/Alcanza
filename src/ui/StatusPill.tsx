import { StyleSheet, Text, View } from 'react-native';

import type { BudgetStatus } from '../domain/budget';
import { useTheme } from '../theme';

const LABELS: Record<BudgetStatus, string> = {
  verde: 'Vas bien',
  naranja: 'Cuidado',
  rojo: 'Ajustado',
};

export function StatusPill({ status }: { status: BudgetStatus }) {
  const theme = useTheme();
  const tone = {
    verde: { fg: theme.colors.success, bg: theme.colors.successSoft },
    naranja: { fg: theme.colors.warning, bg: theme.colors.warningSoft },
    rojo: { fg: theme.colors.danger, bg: theme.colors.dangerSoft },
  }[status];

  return (
    <View
      accessibilityLabel={`Estado del presupuesto: ${LABELS[status]}`}
      style={[styles.pill, { backgroundColor: tone.bg }]}
    >
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <Text
        maxFontSizeMultiplier={1.4}
        style={[styles.label, { color: tone.fg }]}
      >
        {LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
});
