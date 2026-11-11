import { StyleSheet, Text, View } from 'react-native';

import { formatCOP } from '../domain/money';
import type { IncomeEntry } from '../domain/budget';
import { useTheme } from '../theme';
import { HapticPressable as Pressable } from './HapticPressable';

interface IncomeItemProps {
  income: IncomeEntry;
  onDelete: () => void;
}

/**
 * Fila de un ingreso en la lista de Hoy. Muestra descripción (o 'Ingreso adicional'),
 * monto positivo en verde y hora, con botón accesible de borrado lógico.
 */
export function IncomeItem({ income, onDelete }: IncomeItemProps) {
  const theme = useTheme();
  const date = new Date(income.ts);
  const time = date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const label = income.description || 'Ingreso adicional';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ingreso de ${formatCOP(income.amount)}, ${label}, ${time}`}
      onPress={onDelete}
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.inputBackground,
          borderColor: theme.colors.separator,
        },
      ]}
    >
      <View style={styles.badge}>
        <Text style={styles.emoji} maxFontSizeMultiplier={1.3}>
          💵
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.label, { color: theme.colors.textSecondary }]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.center}>
        <Text
          style={[styles.amount, { color: theme.colors.success }]}
          maxFontSizeMultiplier={1.4}
        >
          +{formatCOP(income.amount)}
        </Text>
        <Text style={[styles.time, { color: theme.colors.textMuted }]}>
          {time}
        </Text>
      </View>
      <View style={styles.delete}>
        <Text style={[styles.deleteIcon, { color: theme.colors.danger }]}>
          ×
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    maxWidth: '45%',
  },
  emoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  center: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  time: {
    fontSize: 13,
    lineHeight: 18,
  },
  delete: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
  },
});
