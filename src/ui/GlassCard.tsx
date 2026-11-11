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
      borderRadius: 20,
      borderColor: theme.colors.separator,
      backgroundColor: theme.colors.glass,
      shadowColor: theme.colors.shadow,
      shadowOpacity: theme.mode === 'dark' ? 0.24 : 0.08,
    },
    style,
  ];

  const inner = (
    <View
      style={[
        styles.inner,
        {
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
          borderColor: theme.colors.separator,
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
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
    elevation: 3,
  },
  inner: {
    borderWidth: 0,
  },
});
