import { Redirect } from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native';

import { useBudgetStore } from '../src/store/useBudgetStore';
import { useTheme } from '../src/theme';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { Screen } from '../src/ui/Screen';

/**
 * Puerta de entrada: espera a que el estado local cargue y decide si la
 * persona debe configurar el mes o ir directo a Hoy.
 */
export default function IndexScreen() {
  const status = useBudgetStore((state) => state.status);
  const needsMonthSetup = useBudgetStore((state) => state.needsMonthSetup);
  const error = useBudgetStore((state) => state.error);
  const initialize = useBudgetStore((state) => state.initialize);
  const theme = useTheme();

  if (status === 'error') {
    return (
      <Screen scroll={false} contentStyle={styles.centered}>
        <Text
          accessibilityRole="header"
          style={[styles.brand, { color: theme.colors.text }]}
        >
          ¿Me alcanza?
        </Text>
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {error ?? 'No pude abrir tus datos locales.'}
        </Text>
        <PrimaryButton
          label="Intentar de nuevo"
          onPress={() => {
            void initialize();
          }}
          style={styles.retry}
        />
      </Screen>
    );
  }

  if (status !== 'ready') {
    return (
      <Screen scroll={false} contentStyle={styles.centered}>
        <Text
          accessibilityRole="header"
          style={[styles.brand, { color: theme.colors.text }]}
        >
          ¿Me alcanza?
        </Text>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={[styles.message, { color: theme.colors.textMuted }]}>
          Abriendo tus datos…
        </Text>
      </Screen>
    );
  }

  return (
    <Redirect href={needsMonthSetup ? '/onboarding/welcome' : '/hoy'} />
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  brand: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 320,
  },
  retry: {
    minWidth: 220,
    marginTop: 8,
  },
});
