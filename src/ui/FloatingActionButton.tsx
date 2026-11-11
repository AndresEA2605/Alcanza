import { StyleSheet, Text } from 'react-native';

import { useTheme } from '../theme';
import { HapticPressable as Pressable } from './HapticPressable';

interface FloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * Botón flotante "+" accesible para registrar elementos.
 */
export function FloatingActionButton({
  onPress,
  accessibilityLabel = 'Agregar gasto',
}: FloatingActionButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: theme.colors.accent },
      ]}
    >
      <Text style={[styles.plus, { color: theme.colors.onAccent }]}>
        +
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  plus: {
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '700',
  },
});
