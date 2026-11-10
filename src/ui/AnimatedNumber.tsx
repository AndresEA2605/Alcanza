import { useEffect, useRef, useState } from 'react';
import {
  Text,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { motion, useTheme } from '../theme';

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  accessibilityLabel?: string;
}

/**
 * Número que sube desde cero con una curva suave de ~1.1 s.
 * Con “reducir movimiento” muestra el valor final de inmediato.
 * El texto accesible siempre anuncia el valor final, no los intermedios.
 */
export function AnimatedNumber({
  value,
  format,
  style,
  duration = motion.numberDuration,
  accessibilityLabel,
}: AnimatedNumberProps) {
  const { reduceMotion } = useTheme();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const displayRef = useRef(display);

  useEffect(() => {
    const update = (next: number) => {
      displayRef.current = next;
      setDisplay(next);
    };

    if (reduceMotion) {
      update(value);
      return;
    }

    const from = displayRef.current;
    const start = Date.now();
    let frame = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) {
        return;
      }

      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      update(from + (value - from) * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [duration, reduceMotion, value]);

  return (
    <Text
      accessibilityLabel={accessibilityLabel ?? format(value)}
      maxFontSizeMultiplier={1.2}
      style={style}
    >
      {format(display)}
    </Text>
  );
}
