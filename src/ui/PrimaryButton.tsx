import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme';
import { tapFeedback } from './haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  accessibilityHint,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: {
      background: theme.colors.accent,
      border: theme.colors.accent,
      text: theme.colors.onAccent,
    },
    secondary: {
      background: theme.colors.surface,
      border: theme.colors.separator,
      text: theme.colors.text,
    },
    ghost: {
      background: 'transparent',
      border: 'transparent',
      text: theme.colors.accent,
    },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      onPress={() => {
        tapFeedback(!theme.reduceMotion);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: theme.radii.md,
          opacity: isDisabled ? 0.45 : 1,
          transform: [
            {
              scale:
                pressed && !isDisabled && !theme.reduceMotion ? 0.985 : 1,
            },
          ],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            maxFontSizeMultiplier={1.4}
            style={[
              styles.label,
              { color: palette.text, fontSize: 17, lineHeight: 22 },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
