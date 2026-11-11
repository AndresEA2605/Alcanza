import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatCOP } from '../../src/domain/money';
import { useBudgetStore } from '../../src/store/useBudgetStore';
import { useOnboardingStore } from '../../src/store/useOnboardingStore';
import { useTheme } from '../../src/theme';
import { BackButton } from '../../src/ui/BackButton';
import { FadeInView } from '../../src/ui/FadeInView';
import { successFeedback } from '../../src/ui/haptics';
import { MoneyInput } from '../../src/ui/MoneyInput';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { Screen } from '../../src/ui/Screen';
import { StepIndicator } from '../../src/ui/StepIndicator';

export default function FixedScreen() {
  const theme = useTheme();
  const income = useOnboardingStore((state) => state.income);
  const fixed = useOnboardingStore((state) => state.fixed);
  const setFixed = useOnboardingStore((state) => state.setFixed);
  const saveMonthConfig = useBudgetStore((state) => state.saveMonthConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (income <= 0) {
    return <Redirect href="/onboarding/income" />;
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/income');
    }
  }

  async function finish(value: number) {
    if (saving) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      setFixed(value);
      await saveMonthConfig(income, value);
      successFeedback(!theme.reduceMotion);
      router.replace('/onboarding/reveal');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pude guardar tus datos. Intenta de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  const monthlyAvailable = income - fixed;

  return (
    <Screen avoidKeyboard contentStyle={styles.content}>
      <FadeInView delay={0} style={styles.header}>
        <BackButton onPress={goBack} />
        <StepIndicator total={2} current={2} />
      </FadeInView>

      <View style={styles.center}>
        <FadeInView delay={80}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.colors.text }]}
          >
            ¿Cuánto apartas para tus gastos fijos?
          </Text>
        </FadeInView>

        <FadeInView delay={160}>
          <Text
            style={[
              styles.subtitle,
              { color: theme.colors.textSecondary, marginTop: theme.spacing.md },
            ]}
          >
            Pagos comprometidos como arriendo, servicios, deudas y
            suscripciones. Este monto se separa de tu ingreso mensual.
          </Text>
        </FadeInView>

        <FadeInView delay={240} style={{ marginTop: theme.spacing.xxl }}>
          <MoneyInput
            value={fixed}
            onChange={setFixed}
            accessibilityLabel="Dinero mensual reservado para gastos fijos en pesos colombianos"
            autoFocus
            onSubmit={() => {
              void finish(fixed);
            }}
          />
        </FadeInView>

        <FadeInView delay={280} style={{ marginTop: theme.spacing.lg }}>
          <View
            style={[
              styles.availableCard,
              {
                backgroundColor: theme.colors.accentSoft,
                borderColor: theme.colors.accent,
              },
            ]}
          >
            <Text style={[styles.availableLabel, { color: theme.colors.textSecondary }]}>
              Te queda para el mes
            </Text>
            <Text
              style={[
                styles.availableAmount,
                {
                  color:
                    monthlyAvailable >= 0
                      ? theme.colors.accent
                      : theme.colors.danger,
                },
              ]}
            >
              {formatCOP(monthlyAvailable)}
            </Text>
            <Text style={[styles.availableHint, { color: theme.colors.textSecondary }]}>
              Ingreso mensual menos dinero reservado para gastos fijos.
            </Text>
          </View>
        </FadeInView>

        {fixed > income ? (
          <FadeInView delay={300} style={{ marginTop: theme.spacing.lg }}>
            <View
              style={[
                styles.warning,
                {
                  backgroundColor: theme.colors.warningSoft,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <Text style={[styles.warningText, { color: theme.colors.warning }]}>
                Tus gastos fijos superan tu ingreso. El número diario saldrá en
                rojo, pero puedes ajustarlo después.
              </Text>
            </View>
          </FadeInView>
        ) : null}
      </View>

      <FadeInView delay={340} style={styles.bottom}>
        {error ? (
          <Text
            accessibilityRole="alert"
            style={[styles.error, { color: theme.colors.danger }]}
          >
            {error}
          </Text>
        ) : null}

        <PrimaryButton
          label="Ver mi número"
          loading={saving}
          onPress={() => {
            void finish(fixed);
          }}
        />

        <PrimaryButton
          label="No tengo gastos fijos"
          variant="ghost"
          disabled={saving}
          onPress={() => {
            void finish(0);
          }}
        />
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    gap: 24,
  },
  header: {
    gap: 14,
  },
  center: {
    width: '100%',
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
    maxWidth: 360,
  },
  availableCard: {
    padding: 16,
    gap: 4,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  availableLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  availableAmount: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  availableHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  warning: {
    padding: 14,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottom: {
    gap: 4,
    width: '100%',
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
});
