import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useBudgetStore } from '../src/store/useBudgetStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useTheme } from '../src/theme';
import { GlassCard } from '../src/ui/GlassCard';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { Screen } from '../src/ui/Screen';
import { SettingsRow } from '../src/ui/SettingsRow';
import { useNotifications } from '../src/ui/useNotifications';

export type AppThemeMode = 'system' | 'light' | 'dark';

const MODE_LABELS: Record<AppThemeMode, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Oscuro',
};

const THEME_MODES: AppThemeMode[] = ['system', 'light', 'dark'];

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const theme = useTheme();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const setReduceMotion = useSettingsStore((state) => state.setReduceMotion);
  const notificationsEnabled = useSettingsStore(
    (state) => state.notificationsEnabled,
  );
  const setNotificationsEnabled = useSettingsStore(
    (state) => state.setNotificationsEnabled,
  );
  const notificationTime = useSettingsStore((state) => state.notificationTime);
  const resetData = useBudgetStore((state) => state.resetData);
  const version = APP_VERSION;

  const { status: notificationStatus, timeUntilNext } = useNotifications(
    notificationsEnabled,
    notificationTime,
  );

  function selectTheme(mode: AppThemeMode) {
    setThemeMode(mode);
  }

  async function handleReset() {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Borrar todos los datos',
        'Esto eliminará ingreso, gastos fijos y gastos registrados. No se puede deshacer.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Borrar', style: 'destructive', onPress: () => resolve(true) },
        ],
      );
    });

    if (confirmed) {
      await resetData();
      router.replace('/');
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.colors.text }]}
        >
          Ajustes
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Configura la app a tu gusto.
        </Text>
      </View>

      <GlassCard contentStyle={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Apariencia
        </Text>

        <View style={styles.themeRow}>
          {THEME_MODES.map((mode) => {
            const selected = themeMode === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Tema ${MODE_LABELS[mode]} ${selected ? 'seleccionado' : ''}`}
                onPress={() => selectTheme(mode)}
                style={[
                  styles.themeButton,
                  {
                    backgroundColor: selected ? theme.colors.accent : 'transparent',
                    borderColor: selected ? theme.colors.accent : theme.colors.separator,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.themeLabel,
                    {
                      color: selected ? theme.colors.onAccent : theme.colors.text,
                      fontWeight: selected ? '700' : '600',
                    },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {MODE_LABELS[mode]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SettingsRow
          title="Reducir movimiento"
          subtitle="Desactiva animaciones y hápticos"
          onPress={() => setReduceMotion(!reduceMotion)}
          chevron={false}
        />
        <View style={styles.toggle}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: reduceMotion }}
            onPress={() => setReduceMotion(!reduceMotion)}
            style={[
              styles.track,
              reduceMotion ? styles.trackActive : styles.trackInactive,
            ]}
          >
            <View
              style={[
                styles.thumb,
                reduceMotion ? styles.thumbRight : styles.thumbLeft,
              ]}
            />
          </Pressable>
          <Text style={[styles.toggleLabel, { color: theme.colors.textSecondary }]}>
            {reduceMotion ? 'Activado' : 'Desactivado'}
          </Text>
        </View>
      </GlassCard>

      <GlassCard contentStyle={styles.card} style={styles.cardMargin}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Notificaciones
        </Text>
        <SettingsRow
          title="Recordatorio diario"
          subtitle={`Recibe un aviso a las ${notificationTime} para revisar tu número`}
          onPress={() => setNotificationsEnabled(!notificationsEnabled)}
          chevron={false}
        />
        <View style={styles.toggle}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: notificationsEnabled }}
            disabled={notificationStatus === 'denied'}
            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
            style={[
              styles.track,
              notificationsEnabled
                ? styles.trackActive
                : styles.trackInactive,
            ]}
          >
            <View
              style={[
                styles.thumb,
                notificationsEnabled
                  ? styles.thumbRight
                  : styles.thumbLeft,
              ]}
            />
          </Pressable>
          <Text
            style={[
              styles.toggleLabel,
              {
                color:
                  notificationStatus === 'denied'
                    ? theme.colors.textMuted
                    : theme.colors.textSecondary,
              },
            ]}
          >
            {notificationStatus === 'denied'
              ? 'Permiso denegado'
              : notificationsEnabled
                ? 'Activado'
                : 'Desactivado'}
          </Text>
        </View>
        {notificationsEnabled && timeUntilNext ? (
          <Text style={[styles.nextNotification, { color: theme.colors.textSecondary }]}>
            Próxima notificación: en {timeUntilNext}
          </Text>
        ) : null}
      </GlassCard>

      <GlassCard contentStyle={styles.card} style={styles.cardMargin}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Datos
        </Text>
        <SettingsRow
          title="Borrar todos los datos"
          subtitle="Elimina ingreso, gastos fijos y gastos registrados"
          onPress={handleReset}
          destructive
        />
      </GlassCard>

      <GlassCard contentStyle={styles.card} style={styles.cardMargin}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          App
        </Text>
        <SettingsRow
          title="Versión"
          subtitle={version}
          chevron={false}
        />
        <SettingsRow
          title="Privacidad"
          subtitle="Todo vive en tu teléfono. Sin cuentas ni servidores."
          chevron={false}
        />
        <SettingsRow
          title="Mi negocio"
          subtitle="Productos, servicios y ganancias diarias"
          onPress={() => router.push('/negocio' as any)}
          chevron={false}
        />
      </GlassCard>

      <PrimaryButton
        label="Volver a Hoy"
        variant="ghost"
        onPress={() => router.replace('/hoy')}
        style={styles.bottomButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  card: {
    gap: 16,
  },
  cardMargin: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themeLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
  },
  trackActive: {
    backgroundColor: '#0A6CFF',
  },
  trackInactive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    left: 2,
    top: 2,
  },
  thumbRight: {
    left: 22,
  },
  thumbLeft: {
    left: 2,
  },
  toggleLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  nextNotification: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  bottomButton: {
    marginTop: 'auto',
    minWidth: 200,
    alignSelf: 'center',
  },
});
