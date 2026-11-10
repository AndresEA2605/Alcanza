import { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../theme';

interface SuccessBannerProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
}

/**
 * Banner temporal de éxito que aparece al guardar un gasto.
 * Se oculta sola tras unos segundos o al tocarla.
 * Con "reducir movimiento" aparece sin animación de entrada.
 */
export function SuccessBanner({
  visible,
  message,
  onDismiss,
}: SuccessBannerProps) {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(visible ? 1 : 0));
  const [translateY] = useState(() => new Animated.Value(visible ? 0 : 20));

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(translateY, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity, translateY]);

  const bannerStyle = [
    styles.banner,
    {
      backgroundColor: theme.colors.successSoft,
      opacity,
      transform: [{ translateY }],
    },
  ];

  return (
    <Animated.View style={bannerStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={message}
        onPress={onDismiss}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Text style={[styles.icon, { color: theme.colors.success }]}>
          ✔
        </Text>
        <Text style={[styles.text, { color: theme.colors.text }]}>
          {message}
        </Text>
        <Text
          style={[styles.dismiss, { color: theme.colors.success }]}
          maxFontSizeMultiplier={1.2}
        >
          Despido
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  icon: {
    fontSize: 20,
    lineHeight: 20,
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  dismiss: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
});
