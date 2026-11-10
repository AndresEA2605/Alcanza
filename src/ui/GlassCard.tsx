import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Intensidad del desenfoque en iOS. */
  intensity?: number;
}

/**
 * Tarjeta translúcida estilo iOS. En Android se usa una superficie sólida
 * equivalente para evitar el costo del desenfoque experimental.
 */
export function GlassCard({
  children,
  style,
  contentStyle,
  intensity = 36,
}: GlassCardProps) {
  const theme = useTheme();

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      borderRadius: theme.radii.lg,
      borderColor: theme.colors.glassBorder,
      backgroundColor: theme.colors.glass,
    },
    style,
  ];

  const inner = (
    <View
      style={[
        styles.inner,
        {
          padding: theme.spacing.xl,
          gap: theme.spacing.md,
          borderColor: theme.colors.glassBorder,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={theme.mode === 'dark' ? 'dark' : 'light'}
        style={cardStyle}
      >
        {inner}
      </BlurView>
    );
  }

  return <View style={cardStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  inner: {
    borderWidth: 0,
  },
});
