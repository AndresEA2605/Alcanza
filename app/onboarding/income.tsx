import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useOnboardingStore } from '../../src/store/useOnboardingStore';
import { useTheme } from '../../src/theme';
import { BackButton } from '../../src/ui/BackButton';
import { FadeInView } from '../../src/ui/FadeInView';
import { MoneyInput } from '../../src/ui/MoneyInput';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { Screen } from '../../src/ui/Screen';
import { StepIndicator } from '../../src/ui/StepIndicator';

export default function IncomeScreen() {
  const theme = useTheme();
  const income = useOnboardingStore((state) => state.income);
  const setIncome = useOnboardingStore((state) => state.setIncome);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/welcome');
    }
  }

  return (
    <Screen avoidKeyboard contentStyle={styles.content}>
      <FadeInView delay={0} style={styles.header}>
        <BackButton onPress={goBack} />
        <StepIndicator total={2} current={1} />
      </FadeInView>

      <View style={styles.center}>
        <FadeInView delay={80}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.colors.text }]}
          >
            ¿Cuánto recibes al mes?
          </Text>
        </FadeInView>

        <FadeInView delay={160}>
          <Text
            style={[
              styles.subtitle,
              { color: theme.colors.textSecondary, marginTop: theme.spacing.md },
            ]}
          >
            Suma tu salario y otros ingresos del mes. Si cambia, puedes
            ajustarlo después.
          </Text>
        </FadeInView>

        <FadeInView delay={240} style={{ marginTop: theme.spacing.xxl }}>
          <MoneyInput
            value={income}
            onChange={setIncome}
            accessibilityLabel="Ingreso mensual en pesos colombianos"
            autoFocus
            onSubmit={() => {
              if (income > 0) {
                router.push('/onboarding/fixed');
              }
            }}
          />
        </FadeInView>
      </View>

      <FadeInView delay={320} style={styles.bottom}>
        <PrimaryButton
          label="Continuar"
          disabled={income <= 0}
          onPress={() => router.push('/onboarding/fixed')}
        />
        <Text style={[styles.footnote, { color: theme.colors.textMuted }]}>
          Escribe el total del mes, no lo que te queda después de gastos.
        </Text>
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    gap: 28,
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
  bottom: {
    gap: 12,
    width: '100%',
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
