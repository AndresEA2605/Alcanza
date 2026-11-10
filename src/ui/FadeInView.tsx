import { useEffect, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';

interface FadeInViewProps {
  children: ReactNode;
  /** Retardo en milisegundos para escalonar la entrada. */
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Entrada suave con opacidad y desplazamiento. Con “reducir movimiento”
 * aparece de inmediato, sin animación.
 */
export function FadeInView({
  children,
  delay = 0,
  distance = 16,
  style,
}: FadeInViewProps) {
  const theme = useTheme();
  const opacity = useSharedValue(theme.reduceMotion ? 1 : 0);
  const offset = useSharedValue(theme.reduceMotion ? 0 : distance);

  useEffect(() => {
    if (theme.reduceMotion) {
      opacity.value = 1;
      offset.value = 0;
      return;
    }

    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration: 460,
        easing: Easing.out(Easing.cubic),
      }),
    );
    offset.value = withDelay(
      delay,
      withTiming(0, {
        duration: 460,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delay, distance, opacity, offset, theme.reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View style={[styles.container, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
