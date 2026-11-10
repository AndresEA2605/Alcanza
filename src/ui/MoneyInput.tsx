import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatCOPInput, parseCOPInput } from '../domain/money';
import { useTheme } from '../theme';

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  autoFocus?: boolean;
  accessibilityLabel: string;
  placeholder?: string;
  onSubmit?: () => void;
}

/**
 * Campo grande de pesos colombianos. Agrega los puntos de miles mientras se
 * escribe y entrega siempre un entero. El símbolo `$` y la unidad `COP` son
 * parte de la presentación, no del valor.
 */
export function MoneyInput({
  value,
  onChange,
  autoFocus = false,
  accessibilityLabel,
  placeholder = '0',
  onSubmit,
}: MoneyInputProps) {
  const theme = useTheme();
  const text = value > 0 ? formatCOPInput(value) : '';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.inputBackground,
          borderColor: theme.colors.separator,
          borderRadius: theme.radii.lg,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.lg,
        },
      ]}
    >
      <View style={styles.row}>
        <Text
          style={[styles.currency, { color: theme.colors.textSecondary }]}
          maxFontSizeMultiplier={1.3}
        >
          $
        </Text>
        <TextInput
          accessibilityLabel={accessibilityLabel}
          autoFocus={autoFocus}
          value={text}
          onChangeText={(raw) => {
            const digits = raw.replace(/\D/g, '').slice(0, 15);
            onChange(parseCOPInput(digits));
          }}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="done"
          selectionColor={theme.colors.accent}
          maxLength={19}
          style={[styles.input, { color: theme.colors.text }]}
        />
        <Text
          style={[styles.unit, { color: theme.colors.textMuted }]}
          maxFontSizeMultiplier={1.3}
        >
          COP
        </Text>
      </View>
      <Text
        style={[styles.hint, { color: theme.colors.textMuted }]}
        maxFontSizeMultiplier={1.4}
      >
        Escribe solo los números. Los puntos aparecen solos.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currency: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '700',
    padding: 0,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
});
