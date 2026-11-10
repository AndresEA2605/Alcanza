import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme';

interface ScreenProps {
  children: ReactNode;
  /** Si es `false`, el contenido no hace scroll. */
  scroll?: boolean;
  /** Ajusta el contenido cuando aparece el teclado. */
  avoidKeyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fondo, área segura y scroll comunes a todas las pantallas.
 * Los círculos de color son decorativos y no reciben toques.
 */
export function Screen({
  children,
  scroll = true,
  avoidKeyboard = false,
  contentStyle,
  style,
}: ScreenProps) {
  const theme = useTheme();

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: theme.spacing.xl,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.lg,
        },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.fixedContent,
        { padding: theme.spacing.xl },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }, style]}
    >
      <BackgroundDecor />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {avoidKeyboard ? (
          <KeyboardAvoidingView
            style={styles.safe}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </SafeAreaView>
    </View>
  );
}

function BackgroundDecor() {
  const theme = useTheme();

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <View
        style={[
          styles.blob,
          styles.blobTop,
          { backgroundColor: theme.colors.backgroundAccent },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobBottom,
          { backgroundColor: theme.colors.backgroundAccentTwo },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedContent: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.9,
  },
  blobTop: {
    top: -140,
    right: -120,
  },
  blobBottom: {
    bottom: -160,
    left: -140,
  },
});
