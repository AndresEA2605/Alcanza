import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { monthLabel } from '../../src/domain/labels';
import { useBudgetStore } from '../../src/store/useBudgetStore';
import { useTheme } from '../../src/theme';
import { FadeInView } from '../../src/ui/FadeInView';
import { GlassCard } from '../../src/ui/GlassCard';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { Screen } from '../../src/ui/Screen';

const FEATURES = [
  {
    emoji: '🎯',
    title: 'Un número para hoy',
    detail: 'Te dice cuánto puedes gastar sin arruinar el resto del mes.',
  },
  {
    emoji: '📶',
    title: 'Funciona sin internet',
    detail: 'Todo se calcula en tu teléfono, incluso en modo avión.',
  },
  {
    emoji: '🔒',
    title: 'Sin cuentas ni servidores',
    detail: 'Tus datos no salen de este dispositivo.',
  },
] as const;

export default function WelcomeScreen() {
  const theme = useTheme();
  const previousConfig = useBudgetStore((state) => state.previousConfig);
  const adoptPreviousConfig = useBudgetStore(
    (state) => state.adoptPreviousConfig,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function adoptPreviousMonth() {
    setBusy(true);
    setError(null);

    try {
      await adoptPreviousConfig();
      router.replace('/onboarding/reveal');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pude copiar los datos del mes anterior.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <FadeInView delay={0}>
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.colors.accentSoft },
            ]}
          >
            <Text
              style={[styles.badgeText, { color: theme.colors.accent }]}
              maxFontSizeMultiplier={1.3}
            >
              100 % local · sin cuentas
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={80}>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={1.2}
            style={[
              styles.brand,
              { color: theme.colors.text, marginTop: theme.spacing.xl },
            ]}
          >
            ¿Me alcanza?
          </Text>
        </FadeInView>

        <FadeInView delay={160}>
          <Text
            style={[
              styles.tagline,
              { color: theme.colors.textSecondary, marginTop: theme.spacing.md },
            ]}
          >
            Tu número diario para gastar sin arruinar el mes.
          </Text>
        </FadeInView>

        <FadeInView delay={240} style={{ marginTop: theme.spacing.xxl }}>
          <GlassCard contentStyle={{ gap: theme.spacing.lg }}>
            {FEATURES.map((feature) => (
              <View key={feature.title} style={styles.feature}>
                <Text style={styles.emoji} maxFontSizeMultiplier={1.2}>
                  {feature.emoji}
                </Text>
                <View style={styles.featureText}>
                  <Text
                    style={[styles.featureTitle, { color: theme.colors.text }]}
                  >
                    {feature.title}
                  </Text>
                  <Text
                    style={[
                      styles.featureDetail,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {feature.detail}
                  </Text>
                </View>
              </View>
            ))}
          </GlassCard>
        </FadeInView>
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

        {previousConfig ? (
          <PrimaryButton
            label={`Usar los datos de ${monthLabel(previousConfig.month)}`}
            variant="secondary"
            loading={busy}
            onPress={() => {
              void adoptPreviousMonth();
            }}
          />
        ) : null}

        <PrimaryButton
          label="Empezar"
          disabled={busy}
          onPress={() => router.push('/onboarding/income')}
        />

        <Text style={[styles.footnote, { color: theme.colors.textMuted }]}>
          Solo te tomará un minuto. Podrás cambiar los montos después.
        </Text>
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    gap: 36,
  },
  top: {
    width: '100%',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  brand: {
    fontSize: 46,
    lineHeight: 52,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 19,
    lineHeight: 26,
    maxWidth: 320,
  },
  feature: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  emoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  featureDetail: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottom: {
    gap: 12,
    width: '100%',
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
