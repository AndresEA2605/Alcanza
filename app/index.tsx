import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useBudgetStore } from '../src/store/useBudgetStore';
import { LoadingState } from '../src/ui/LoadingState';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { Screen } from '../src/ui/Screen';
import { useTheme } from '../src/theme';

/**
 * Puerta de entrada: espera a que el estado local cargue y decide si la
 * persona debe configurar el mes o ir directo a Hoy.
 */
export default function IndexScreen() {
  const theme = useTheme();
  const [acceptedExpoGoNotice, setAcceptedExpoGoNotice] = useState(false);
  const status = useBudgetStore((state) => state.status);
  const needsMonthSetup = useBudgetStore((state) => state.needsMonthSetup);
  const error = useBudgetStore((state) => state.error);
  const initialize = useBudgetStore((state) => state.initialize);

  if (status === 'error') {
    return (
      <LoadingState
        key={status}
        title="Preparando la app…"
        error={error ?? 'No pude abrir tus datos locales.'}
        onRetry={() => void initialize()}
      />
    );
  }

  if (status !== 'ready') {
    return <LoadingState key={status} title="Abriendo tus datos…" />;
  }

  if (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
    !acceptedExpoGoNotice
  ) {
    return (
      <Screen contentStyle={styles.noticeContent}>
        <View
          accessibilityRole="header"
          style={[
            styles.noticeCard,
            {
              backgroundColor: theme.colors.warningSoft,
              borderColor: theme.colors.warning,
            },
          ]}
        >
          <Text style={[styles.noticeTitle, { color: theme.colors.text }]}>
            Aviso de privacidad
          </Text>
          <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
            Expo Go no incluye el cifrado SQLCipher. Tus registros financieros
            de esta sesión se guardarán localmente, pero sin cifrado de base de
            datos. Para máxima protección, usa una versión de desarrollo
            instalada. Las imágenes de productos siguen cifradas.
          </Text>
        </View>
        <PrimaryButton
          label="Continuar en Expo Go"
          onPress={() => setAcceptedExpoGoNotice(true)}
        />
      </Screen>
    );
  }

  return (
    <Redirect href={needsMonthSetup ? '/onboarding/welcome' : '/hoy'} />
  );
}

const styles = StyleSheet.create({
  noticeContent: {
    justifyContent: 'center',
    gap: 20,
  },
  noticeCard: {
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 20,
  },
  noticeTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  noticeText: {
    fontSize: 16,
    lineHeight: 23,
  },
});
