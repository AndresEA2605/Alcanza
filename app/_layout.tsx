import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform, type ViewStyle } from 'react-native';

import { useBudgetStore } from '../src/store/useBudgetStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { ThemeProvider, useTheme } from '../src/theme';

// La pantalla de arranque se oculta cuando el estado local ya está listo.
SplashScreen.preventAutoHideAsync().catch(() => {
  // En web o si Expo Go ya la ocultó, no hay nada que hacer.
});

// Las notificaciones recibidas se muestran sin interacción adicional.
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
  const isWeb = Platform.OS === 'web';

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

  // En web móvil: resetear body/html para eliminar barras blancas/negras en los
  // bordes, aplicar el color de fondo del tema y bloquear scroll/zoom no deseado.
  useEffect(() => {
    if (!isWeb) {
      return;
    }
    const body = document.body;
    const html = document.documentElement;
    const bg = String(theme.colors.background);

    const prev = {
      bodyMargin: body.style.margin,
      bodyPadding: body.style.padding,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyBg: body.style.backgroundColor,
      htmlMargin: html.style.margin,
      htmlPadding: html.style.padding,
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlBg: html.style.backgroundColor,
    };

    body.style.margin = '0';
    body.style.padding = '0';
    body.style.overflow = 'hidden';
    body.style.height = '100%';
    body.style.backgroundColor = bg;
    html.style.margin = '0';
    html.style.padding = '0';
    html.style.overflow = 'hidden';
    html.style.height = '100%';
    html.style.backgroundColor = bg;

    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    const prevContent = meta.getAttribute('content');
    meta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    );

    return () => {
      body.style.margin = prev.bodyMargin;
      body.style.padding = prev.bodyPadding;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.backgroundColor = prev.bodyBg;
      html.style.margin = prev.htmlMargin;
      html.style.padding = prev.htmlPadding;
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      html.style.backgroundColor = prev.htmlBg;
      if (prevContent) {
        meta.setAttribute('content', prevContent);
      }
    };
  }, [isWeb, theme.colors.background]);

  const containerStyle: ViewStyle = {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.background,
  };

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <View style={containerStyle}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: theme.colors.background,
              flex: 1,
            },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="hoy" />
          <Stack.Screen name="balance" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="negocio" />
          <Stack.Screen
            name="negocio/tienda"
            options={{ title: 'Mi Tienda' }}
          />
          <Stack.Screen
            name="negocio/nuevo"
            options={{ title: 'Nuevo producto' }}
          />
          <Stack.Screen
            name="negocio/nueva-cuenta"
            options={{ title: 'Nueva cuenta' }}
          />
          <Stack.Screen
            name="negocio/ajustes"
            options={{ title: 'Ajustes del negocio' }}
          />
          <Stack.Screen
            name="negocio/editar\[id\]"
            options={{ title: 'Editar producto' }}
          />
        </Stack>
      </View>
    </>
  );
}
