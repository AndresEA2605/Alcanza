import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { deleteAllProductImages } from '../src/data/productImageStorage';
import { useBudgetStore } from '../src/store/useBudgetStore';
import { useOnboardingStore } from '../src/store/useOnboardingStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useTheme } from '../src/theme';
import { GlassCard } from '../src/ui/GlassCard';
import { HapticPressable as Pressable } from '../src/ui/HapticPressable';
import { LoadingState } from '../src/ui/LoadingState';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { Screen } from '../src/ui/Screen';
import { SettingsRow } from '../src/ui/SettingsRow';
import { SettingsToggleRow } from '../src/ui/SettingsToggleRow';
import { DataResetModal } from '../src/ui/settings/DataResetModal';
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
  const config = useBudgetStore((state) => state.config);
  const budgetStatus = useBudgetStore((state) => state.status);
  const budgetError = useBudgetStore((state) => state.error);
  const initializeBudget = useBudgetStore((state) => state.initialize);
  const resetData = useBudgetStore((state) => state.resetData);
  const setIncome = useOnboardingStore((state) => state.setIncome);
  const setFixed = useOnboardingStore((state) => state.setFixed);
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [pendingImageUris, setPendingImageUris] = useState<string[] | null>(
    null,
  );
  const version = APP_VERSION;

  const { status: notificationStatus, timeUntilNext } = useNotifications(
    notificationsEnabled,
    notificationTime,
  );

  useEffect(() => {
    if (budgetStatus === 'idle') {
      void initializeBudget();
    }
  }, [budgetStatus, initializeBudget]);

  function selectTheme(mode: AppThemeMode) {
    setThemeMode(mode);
  }

  function editBudgetAmounts() {
    if (!config) return;
    setIncome(config.income);
    setFixed(config.fixed);
    router.push('/onboarding/income');
  }

  function openResetConfirmation() {
    setConfirmation('');
    setResetError(null);
    setPendingImageUris(null);
    setResetModalVisible(true);
  }

  function closeResetConfirmation() {
    if (resetting || pendingImageUris !== null) return;
    setResetModalVisible(false);
    setConfirmation('');
    setResetError(null);
  }

  async function handleReset() {
    if (confirmation !== 'CONFIRMAR' || resetting) return;

    setResetting(true);
    setResetError(null);
    let dataWasReset = pendingImageUris !== null;

    try {
      const imageUris = pendingImageUris ?? await resetData();
      dataWasReset = true;
      resetOnboarding();
      setPendingImageUris(imageUris);
      deleteAllProductImages();
      setPendingImageUris(null);
      setResetModalVisible(false);
      setConfirmation('');
      router.replace('/');
    } catch (error) {
      setResetError(
        dataWasReset
          ? 'Los datos ya se borraron, pero no se pudieron quitar todas las imágenes. Intenta de nuevo para terminar.'
          : error instanceof Error
            ? error.message
            : 'No se pudieron borrar los datos. Intenta de nuevo.',
      );
    } finally {
      setResetting(false);
    }
  }

  if (budgetStatus === 'idle' || budgetStatus === 'loading') {
    return <LoadingState key={budgetStatus} title="Cargando ajustes…" />;
  }

  if (budgetStatus === 'error') {
    return (
      <LoadingState
        key={budgetStatus}
        title="Cargando ajustes…"
        error={budgetError}
        onRetry={() => void initializeBudget()}
      />
    );
  }

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
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
          Presupuesto
        </Text>
        <SettingsRow
          title="Ingreso mensual y dinero reservado"
          subtitle="Actualiza tus montos mensuales"
          onPress={editBudgetAmounts}
        />
      </GlassCard>

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

        <SettingsToggleRow
          title="Reducir movimiento"
          subtitle="Desactiva animaciones y hápticos"
          value={reduceMotion}
          onValueChange={setReduceMotion}
        />
      </GlassCard>

      <GlassCard contentStyle={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Notificaciones
        </Text>
        <SettingsToggleRow
          title="Recordatorio diario"
          subtitle={`Recibe un aviso a las ${notificationTime} para revisar tu número`}
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          disabled={notificationStatus === 'denied'}
          statusLabel={
            notificationStatus === 'denied'
              ? 'Permiso denegado'
              : undefined
          }
        />
        {notificationsEnabled && timeUntilNext ? (
          <Text style={[styles.nextNotification, { color: theme.colors.textSecondary }]}>
            Próxima notificación: en {timeUntilNext}
          </Text>
        ) : null}
      </GlassCard>

      <GlassCard contentStyle={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Datos
        </Text>
        <SettingsRow
          title="Borrar todos los datos"
          subtitle="Elimina presupuesto, movimientos y productos"
          onPress={openResetConfirmation}
          destructive
        />
      </GlassCard>

      <GlassCard contentStyle={styles.card}>
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
          subtitle="Productos, servicios y metas de ganancia"
          onPress={() => router.push('/negocio' as any)}
        />
      </GlassCard>

      <PrimaryButton
        label="Volver a Hoy"
        variant="ghost"
        onPress={() => router.replace('/hoy')}
        style={styles.bottomButton}
      />
      <DataResetModal
        visible={resetModalVisible}
        confirmation={confirmation}
        onConfirmationChange={setConfirmation}
        onClose={closeResetConfirmation}
        onConfirm={() => void handleReset()}
        busy={resetting}
        error={resetError}
        canRetryCleanup={pendingImageUris !== null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
