import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { PrimaryButton } from './PrimaryButton';

interface LoadingStateProps {
  title: string;
  error?: string | null;
  onRetry?: () => void;
}

export function LoadingState({ title, error, onRetry }: LoadingStateProps) {
  const theme = useTheme();
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    if (error) return;

    const timer = setTimeout(() => setLongWait(true), 10_000);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          {error ? null : <ActivityIndicator size="large" color={theme.colors.accent} />}
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.colors.text }]}
          >
            {error ? 'No se pudo cargar' : title}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.message, { color: theme.colors.textSecondary }]}
          >
            {error
              ? error
              : longWait
                ? 'Está tardando más de lo normal. Espera un momento mientras cargamos tus datos.'
                : 'Espera un momento mientras cargamos tus datos.'}
          </Text>
          {error && onRetry ? (
            <PrimaryButton
              label="Intentar de nuevo"
              onPress={onRetry}
              style={styles.retry}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
  },
  retry: {
    minWidth: 220,
    marginTop: 4,
  },
});
