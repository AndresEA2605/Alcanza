import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { useBudgetStore } from '../src/store/useBudgetStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { ThemeProvider, useTheme } from '../src/theme';

// La pantalla de arranque se oculta cuando el estado local ya está listo.
SplashScreen.preventAutoHideAsync().catch(() => {
  // En web o si Expo Go ya la ocultó, no hay nada que hacer.
});

// Las notificaciones recibidas se muestran sin interacción adicional.
// En web el handler puede no estar disponible; no bloqueamos la app por ello.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Notificaciones no disponibles en este entorno.
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const theme = useTheme();
  const status = useBudgetStore((state) => state.status);
  const initialize = useBudgetStore((state) => state.initialize);
  const loadSettings = useSettingsStore((state) => state.load);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void initialize();
    void loadSettings();
  }, [initialize, loadSettings]);

  useEffect(() => {
    if (status === 'ready' || status === 'error') {
      SplashScreen.hideAsync().catch(() => {
        // La app ya es visible; no se bloquea por la pantalla de arranque.
      });
    }
  }, [status]);

  // Cuando el usuario toca la notificación, abre la pantalla Hoy.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      () => {
        void router.replace('/hoy');
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const containerStyle = {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <View style={containerStyle}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background, flex: 1 },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="hoy" />
          <Stack.Screen name="balance" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="negocio" />
        </Stack>
      </View>
    </>
  );
}
