import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  calcTodayFromState,
  useBudgetStore,
} from '../../src/store/useBudgetStore';
import { useOnboardingStore } from '../../src/store/useOnboardingStore';
import { useTheme } from '../../src/theme';
import { daysLeftSentence, monthLabel } from '../../src/domain/labels';
import { formatCOP } from '../../src/domain/money';
import { AnimatedNumber } from '../../src/ui/AnimatedNumber';
import { FadeInView } from '../../src/ui/FadeInView';
import { GlassCard } from '../../src/ui/GlassCard';
import { successFeedback } from '../../src/ui/haptics';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { Screen } from '../../src/ui/Screen';
import { StatusPill } from '../../src/ui/StatusPill';

export default function RevealScreen() {
  const theme = useTheme();
  const config = useBudgetStore((state) => state.config);
  const expenses = useBudgetStore((state) => state.expenses);
  const setIncome = useOnboardingStore((state) => state.setIncome);
  const setFixed = useOnboardingStore((state) => state.setFixed);
  const [now] = useState(Date.now);

  const today = calcTodayFromState({ config, expenses }, now);

  if (!config || !today) {
    return <Redirect href="/onboarding/welcome" />;
  }

  const daily = Math.max(0, today.daily);
  const disposable = config.income - config.fixed;

  function changeAmounts() {
    if (!config) {
      return;
    }

    setIncome(config.income);
    setFixed(config.fixed);
    router.dismissAll();
    router.push('/onboarding/income');
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <FadeInView delay={0}>
          <Text
            style={[styles.overline, { color: theme.colors.accent }]}
            maxFontSizeMultiplier={1.3}
          >
            Listo para {monthLabel(config.month)}
          </Text>
        </FadeInView>

        <FadeInView delay={90} style={{ marginTop: theme.spacing.lg }}>
          <GlassCard contentStyle={styles.hero}>
            <Text style={[styles.heroLabel, { color: theme.colors.textMuted }]}>
              Puedes gastar hoy
            </Text>
            <AnimatedNumber
              value={daily}
              format={(value) => formatCOP(Math.round(value))}
              accessibilityLabel={`Puedes gastar hoy ${formatCOP(
                Math.round(daily),
              )}`}
              style={[styles.number, { color: theme.colors.text }]}
            />
            <Text style={[styles.perDay, { color: theme.colors.textSecondary }]}>
              por día
            </Text>
            <View style={{ marginTop: theme.spacing.sm }}>
              <StatusPill status={today.status} />
            </View>
          </GlassCard>
        </FadeInView>

        <FadeInView delay={190} style={{ marginTop: theme.spacing.xl }}>
          <Text
            style={[styles.sentence, { color: theme.colors.textSecondary }]}
          >
            {daily > 0
              ? 'Si gastas eso hoy, tu número de mañana se mantiene sano. Si gastas menos, sube.'
              : 'Tus gastos fijos consumen todo el ingreso. Ajusta los montos para tener un número diario.'}
          </Text>
        </FadeInView>

        <FadeInView delay={270} style={{ marginTop: theme.spacing.xl }}>
          <GlassCard contentStyle={{ gap: theme.spacing.md }}>
            <SummaryRow
              label="Ingreso del mes"
              value={formatCOP(config.income)}
            />
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.separator },
              ]}
            />
            <SummaryRow
              label="Gastos fijos"
              value={formatCOP(-config.fixed)}
            />
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.separator },
              ]}
            />
            <SummaryRow
              label="Disponible para el mes"
              value={formatCOP(disposable)}
              strong
            />
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.separator },
              ]}
            />
            <SummaryRow
              label="Tiempo restante"
              value={daysLeftSentence(today.daysLeft)}
            />
          </GlassCard>
        </FadeInView>
      </View>

      <FadeInView delay={350} style={styles.bottom}>
        <PrimaryButton
          label="Empezar"
          onPress={() => {
            successFeedback(!theme.reduceMotion);
            // Deja solo la pantalla de Hoy en la pila: volver atrás no debe
            // regresar al onboarding ya completado.
            router.dismissAll();
            router.replace('/hoy');
          }}
        />
        <PrimaryButton
          label="Cambiar montos"
          variant="ghost"
          onPress={changeAmounts}
        />
      </FadeInView>
    </Screen>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          {
            color: strong ? theme.colors.text : theme.colors.textSecondary,
            fontWeight: strong ? '700' : '600',
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    gap: 28,
  },
  top: {
    width: '100%',
  },
  overline: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  heroLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  number: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  perDay: {
    fontSize: 15,
    lineHeight: 20,
  },
  sentence: {
    fontSize: 17,
    lineHeight: 24,
    maxWidth: 380,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  summaryValue: {
    fontSize: 15,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  bottom: {
    gap: 4,
    width: '100%',
  },
});
