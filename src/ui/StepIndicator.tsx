import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';

interface StepIndicatorProps {
  total: number;
  /** Paso actual, empezando en 1. */
  current: number;
}

/** Barra fina de progreso del onboarding. */
export function StepIndicator({ total, current }: StepIndicatorProps) {
  const theme = useTheme();
  const steps = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${current} de ${total}`}
      accessibilityValue={{ min: 1, max: total, now: current }}
      style={[styles.row, { gap: theme.spacing.sm }]}
    >
      {steps.map((step) => (
        <View
          key={step}
          style={[
            styles.track,
            {
              backgroundColor:
                step <= current
                  ? theme.colors.accent
                  : theme.colors.separator,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});
