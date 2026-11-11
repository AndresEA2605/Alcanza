import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  normalizeBusinessGoal,
  type BusinessGoalPeriod,
} from '../../src/domain/business';
import { formatCOP } from '../../src/domain/money';
import { useBusinessStore } from '../../src/store/useBusinessStore';
import { useTheme } from '../../src/theme';
import { BackButton } from '../../src/ui/BackButton';
import { FadeInView } from '../../src/ui/FadeInView';
import { GlassCard } from '../../src/ui/GlassCard';
import { HapticPressable as Pressable } from '../../src/ui/HapticPressable';
import { LoadingState } from '../../src/ui/LoadingState';
import { MoneyInput } from '../../src/ui/MoneyInput';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { Screen } from '../../src/ui/Screen';

const GOAL_PERIODS: readonly {
  id: BusinessGoalPeriod;
  label: string;
}[] = [
  { id: 'daily', label: 'Diaria' },
  { id: 'monthly', label: 'Mensual' },
  { id: 'yearly', label: 'Anual' },
];

export default function BusinessSettingsScreen() {
  const status = useBusinessStore((state) => state.status);
  const storeError = useBusinessStore((state) => state.error);
  const initialize = useBusinessStore((state) => state.initialize);
  const goalAmount = useBusinessStore((state) => state.goalAmount);
  const goalPeriod = useBusinessStore((state) => state.goalPeriod);

  useEffect(() => {
    if (status === 'idle') {
      void initialize();
    }
  }, [initialize, status]);

  if (status === 'idle' || status === 'loading') {
    return <LoadingState key={status} title="Cargando ajustes…" />;
  }

  if (status === 'error') {
    return (
      <LoadingState
        key={status}
        title="Cargando ajustes…"
        error={storeError}
        onRetry={() => void initialize()}
      />
    );
  }

  return <BusinessGoalForm goalAmount={goalAmount} goalPeriod={goalPeriod} />;
}

function BusinessGoalForm({
  goalAmount,
  goalPeriod,
}: {
  goalAmount: number;
  goalPeriod: BusinessGoalPeriod;
}) {
  const theme = useTheme();
  const saveGoal = useBusinessStore((state) => state.saveGoal);
  const [amount, setAmount] = useState(goalAmount);
  const [period, setPeriod] = useState<BusinessGoalPeriod>(goalPeriod);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveGoal({ goalAmount: amount, goalPeriod: period });
      router.back();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la meta. Intenta de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  const dailyGoal = normalizeBusinessGoal(amount, period);

  return (
    <Screen avoidKeyboard contentStyle={styles.screen}>
      <FadeInView delay={0} style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.colors.text }]}
        >
          Ajustes de Mi negocio
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Define una meta de ganancia para todo tu negocio.
        </Text>
      </FadeInView>

      <FadeInView delay={100}>
        <GlassCard contentStyle={styles.card}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Periodo de la meta
          </Text>
          <View
            style={[
              styles.periods,
              { backgroundColor: theme.colors.inputBackground },
            ]}
            accessibilityRole="radiogroup"
            accessibilityLabel="Periodo de la meta de ganancia"
          >
            {GOAL_PERIODS.map((option) => {
              const selected = period === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setPeriod(option.id)}
                  style={[
                    styles.period,
                    selected && { backgroundColor: theme.colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.periodText,
                      {
                        color: selected
                          ? theme.colors.onAccent
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Meta de ganancia neta
          </Text>
          <MoneyInput
            value={amount}
            onChange={setAmount}
            accessibilityLabel={`Meta de ganancia ${period} en pesos colombianos`}
          />
          <Text style={[styles.helper, { color: theme.colors.textMuted }]}>
            Equivale a {formatCOP(dailyGoal)} por día. Usa cero para ocultar la
            meta.
          </Text>
        </GlassCard>
      </FadeInView>

      {saveError ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: theme.colors.danger }]}
        >
          {saveError}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          label="Guardar meta"
          loading={saving}
          disabled={saving}
          onPress={() => void handleSave()}
        />
        <PrimaryButton
          label="Cancelar"
          variant="ghost"
          disabled={saving}
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
    gap: 24,
  },
  header: {
    gap: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
  },
  card: {
    gap: 16,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periods: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 14,
  },
  period: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helper: {
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 4,
  },
});
