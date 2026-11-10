import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useBudgetStore } from '../../src/store/useBudgetStore';
import { useTheme } from '../../src/theme';
import { BackButton } from '../../src/ui/BackButton';
import { FadeInView } from '../../src/ui/FadeInView';
import { GlassCard } from '../../src/ui/GlassCard';
import { MoneyInput } from '../../src/ui/MoneyInput';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { Screen } from '../../src/ui/Screen';

export default function NuevaCuentaScreen() {
  const theme = useTheme();
  const s = styles(theme);
  const addExpense = useBudgetStore((state) => state.addExpense);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorState] = useState<string | null>(null);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/negocio');
    }
  }

  async function handleSave() {
    if (saving) return;
    if (!name.trim()) {
      setErrorState('El nombre es obligatorio.');
      return;
    }
    if (amount <= 0) {
      setErrorState('El monto debe ser mayor que 0.');
      return;
    }
    setSaving(true);
    try {
      await addExpense({
        amount,
        category: 'comida',
        ts: Date.now(),
      });
      router.replace('/negocio');
    } catch {
      setErrorState('No pude guardar la cuenta. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen avoidKeyboard contentStyle={s.content}>
      <FadeInView delay={0} style={s.header}>
        <BackButton onPress={goBack} />
      </FadeInView>
      <View style={s.center}>
        <FadeInView delay={80}>
          <Text style={[s.title, { color: theme.colors.text }]}>Nuevo dinero</Text>
        </FadeInView>
        <FadeInView delay={140}>
          <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>¿Dónde tienes tu dinero? Ejemplos: efectivo, cuenta bancaria, billetera digital.</Text>
        </FadeInView>
        <FadeInView delay={220} style={{ marginTop: theme.spacing.xxl }}>
          <GlassCard contentStyle={{ gap: theme.spacing.lg }}>
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: theme.colors.textSecondary }]}>Nombre de la cuenta</Text>
              <View style={s.inputContainer}>
                <TextInput style={[s.input, { color: theme.colors.text }]} maxFontSizeMultiplier={1.4} value={name} onChangeText={setName} placeholder="Ej: Efectivo en mano" placeholderTextColor={theme.colors.textMuted} autoCapitalize="words" autoFocus />
              </View>
            </View>
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: theme.colors.textSecondary }]}>Monto (COP)</Text>
              <View style={s.inputContainer}>
                <MoneyInput value={amount} onChange={(v) => setAmount(v)} accessibilityLabel="Monto en COP" />
              </View>
            </View>
            {errorMessage ? (
              <FadeInView delay={300}>
                <Text accessibilityRole="alert" style={[s.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
              </FadeInView>
            ) : null}
          </GlassCard>
        </FadeInView>
      </View>
      <FadeInView delay={340} style={s.bottom}>
        <PrimaryButton label="Guardar cuenta" loading={saving} disabled={!name.trim() || amount <= 0} onPress={handleSave} />
        <PrimaryButton label="Cancelar" variant="ghost" disabled={saving} onPress={goBack} />
      </FadeInView>
    </Screen>
  );
}

function styles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    content: { justifyContent: 'space-between', gap: 24 },
    header: { gap: 14 },
    center: { width: '100%' },
    title: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { fontSize: 17, lineHeight: 24, maxWidth: 360 },
    fieldGroup: { gap: 8 },
    fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
    inputContainer: { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.separator, borderRadius: theme.radii.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
    input: { fontSize: 20, lineHeight: 26 },
    bottom: { gap: 4, width: '100%' },
    error: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  });
}
