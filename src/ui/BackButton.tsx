import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../theme';

export function BackButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed ? 0.55 : 1 },
      ]}
    >
      <Text
        style={[styles.arrow, { color: theme.colors.accent }]}
        maxFontSizeMultiplier={1.4}
      >
        ‹
      </Text>
      <Text
        style={[styles.label, { color: theme.colors.accent }]}
        maxFontSizeMultiplier={1.4}
      >
        Atrás
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    minHeight: 44,
    paddingRight: 8,
  },
  arrow: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '400',
    marginTop: -2,
  },
  label: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
  },
});
