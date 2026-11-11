import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { HapticPressable as Pressable } from './HapticPressable';

interface SettingsToggleRowProps {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  statusLabel?: string;
}

export function SettingsToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  statusLabel,
}: SettingsToggleRowProps) {
  const theme = useTheme();
  const stateLabel = statusLabel ?? (value ? 'Activado' : 'Desactivado');

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={`${title}. ${stateLabel}`}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        styles.row,
        { opacity: disabled ? 0.55 : pressed ? 0.75 : 1 },
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.control}>
        <Text style={[styles.status, { color: theme.colors.textMuted }]}>
          {stateLabel}
        </Text>
        <View
          style={[
            styles.track,
            {
              backgroundColor: value
                ? theme.colors.accent
                : theme.colors.separator,
            },
          ]}
        >
          <View
            style={[
              styles.thumb,
              { backgroundColor: theme.colors.surface },
              value ? styles.thumbOn : styles.thumbOff,
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 8,
  },
  copy: {
    flex: 1,
    gap: 3,
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
  control: {
    minWidth: 68,
    alignItems: 'center',
    gap: 6,
  },
  status: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    left: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  thumbOff: {
    transform: [{ translateX: 0 }],
  },
  thumbOn: {
    transform: [{ translateX: 20 }],
  },
});
