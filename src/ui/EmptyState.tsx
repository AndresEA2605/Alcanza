import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  emoji?: string;
}

/**
 * Estado vacío atractivo: emoji grande, título y subtítulo centrados.
 * Se usa cuando no hay gastos hoy ni datos que mostrar.
 */
export function EmptyState({ title, subtitle, emoji = '📭' }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.emoji, { color: theme.colors.textMuted }]}>
        {emoji}
      </Text>
      <Text
        style={[styles.title, { color: theme.colors.textSecondary }]}
        maxFontSizeMultiplier={1.3}
      >
        {title}
      </Text>
      <Text
        style={[styles.subtitle, { color: theme.colors.textMuted }]}
        maxFontSizeMultiplier={1.2}
      >
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emoji: {
    fontSize: 56,
    lineHeight: 60,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260,
  },
});
