import { StyleSheet, Text, View } from 'react-native';

import { formatCOP } from '../domain/money';
import { CATEGORIES, type Expense } from '../domain/budget';
import { useTheme } from '../theme';
import { HapticPressable as Pressable } from './HapticPressable';

interface ExpenseItemProps {
  expense: Expense;
  onDelete: () => void;
}

/**
 * Fila de un gasto en la lista de Hoy. Muestra categoría, monto y hora,
 * con un botón de borrar que activa el borrado lógico y deshacer.
 */
export function ExpenseItem({ expense, onDelete }: ExpenseItemProps) {
  const theme = useTheme();
  const categoryMeta = CATEGORIES.find((item) => item.id === expense.category);
  const date = new Date(expense.ts);
  const time = date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Gasto de ${formatCOP(expense.amount)} en ${categoryMeta?.label ?? expense.category}, ${time}`}
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
          {categoryMeta?.emoji ?? '🛒'}
        </Text>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {categoryMeta?.label ?? expense.category}
        </Text>
      </View>
      <View style={styles.center}>
        <Text
          style={[styles.amount, { color: theme.colors.text }]}
          maxFontSizeMultiplier={1.4}
        >
          −{formatCOP(expense.amount).replace('−$ ', '$ ')}
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
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    flex: 1,
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
  },
  deleteIcon: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '600',
  },
});
