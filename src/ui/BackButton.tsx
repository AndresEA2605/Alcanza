import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../theme';
import { tapFeedback } from './haptics';

export function BackButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const [isHandlingBack, setIsHandlingBack] = useState(false);
  const handlingBack = useRef(false);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (unlockTimer.current) {
        clearTimeout(unlockTimer.current);
      }
    },
    [],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      accessibilityState={{ disabled: isHandlingBack }}
      disabled={isHandlingBack}
      onPress={() => {
        if (handlingBack.current) return;

        handlingBack.current = true;
        setIsHandlingBack(true);
        unlockTimer.current = setTimeout(() => {
          handlingBack.current = false;
          setIsHandlingBack(false);
          unlockTimer.current = null;
        }, 500);

        tapFeedback(!theme.reduceMotion);
        onPress();
      }}
      hitSlop={12}
      style={({ pressed }) => [
        styles.button,
        {
          opacity: isHandlingBack ? 0.5 : pressed ? 0.65 : 1,
          transform: [
            { translateX: pressed && !theme.reduceMotion ? -2 : 0 },
          ],
        },
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
