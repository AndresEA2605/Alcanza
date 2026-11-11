import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { HapticPressable as Pressable } from './HapticPressable';

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
}

/**
 * Fila de ajuste con título, descripción opcional y flecha a la derecha.
 */
export function SettingsRow({
  title,
  subtitle,
  onPress,
  chevron = true,
  destructive = false,
}: SettingsRowProps) {
  const theme = useTheme();
  const disabled = !onPress;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.row,
        {
          borderColor: theme.colors.separator,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.textContainer}>
        <Text
          style={[styles.title, { color: theme.colors.text }]}
          maxFontSizeMultiplier={1.3}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            maxFontSizeMultiplier={1.2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {chevron ? (
        <View style={styles.chevron}>
          <Text style={[styles.chevronText, { color: theme.colors.textMuted }]}>
            ›
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    marginLeft: 8,
  },
  chevronText: {
    fontSize: 22,
    lineHeight: 22,
  },
});
