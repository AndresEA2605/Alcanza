import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  calculateBusiness,
  type BusinessType,
} from '../../src/domain/business';
import { formatCOP } from '../../src/domain/money';
import { useBusinessStore } from '../../src/store/useBusinessStore';
import { useTheme } from '../../src/theme';
import { BackButton } from '../../src/ui/BackButton';
import { FadeInView } from '../../src/ui/FadeInView';
import { GlassCard } from '../../src/ui/GlassCard';
import { MoneyInput } from '../../src/ui/MoneyInput';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { Screen } from '../../src/ui/Screen';

export default function NuevoNegocioScreen() {
  const theme = useTheme();
  const addItem = useBusinessStore((state) => state.addItem);

  const [type, setType] = useState<BusinessType>('product');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [investment, setInvestment] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorState] = useState<string | null>(null);

  const calculation = useMemo(() => {
    return calculateBusiness({
      type,
      quantity: Math.max(1, quantity),
      pricePerUnit,
      investment: type === 'product' ? investment : 0,
      dailyGoal,
    });
  }, [type, quantity, pricePerUnit, investment, dailyGoal]);

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
      setErrorState('El nombre del producto o servicio es obligatorio.');
      return;
    }

    if (quantity <= 0) {
      setErrorState('La cantidad diaria debe ser mayor que 0.');
      return;
    }

    if (pricePerUnit <= 0) {
      setErrorState('El precio de venta debe ser mayor que 0.');
      return;
    }

    setSaving(true);
    setErrorState(null);

    try {
      await addItem({
        name: name.trim(),
        type,
        quantity,
        pricePerUnit,
        investment: type === 'product' ? investment : 0,
        dailyGoal,
      });
      router.replace('/negocio');
    } catch (err) {
      setErrorState(
        err instanceof Error
          ? err.message
          : 'No pude guardar el producto o servicio. Intenta de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  const isProduct = type === 'product';

  return (
    <Screen avoidKeyboard contentStyle={styles.screenContent}>
      <FadeInView delay={0} style={styles.header}>
        <BackButton onPress={goBack} />
      </FadeInView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { gap: theme.spacing.lg }]}
      >
        <FadeInView delay={60}>
          <Text
            style={[styles.overline, { color: theme.colors.accent }]}
            maxFontSizeMultiplier={1.3}
          >
            NUEVO ELEMENTO
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.colors.text }]}
          >
            {isProduct ? 'Nuevo producto' : 'Nuevo servicio'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {isProduct
              ? 'Para productos que compras o preparas para vender (ej. canasta de huevos, postres, ropa).'
              : 'Para servicios por viaje, hora o trabajo realizado (ej. InDriver, cortes de cabello, reparaciones).'}
          </Text>
        </FadeInView>

        {/* Selector de Tipo (Producto vs Servicio) */}
        <FadeInView delay={110}>
          <View
            style={[
              styles.typeSelector,
              { backgroundColor: theme.colors.inputBackground },
            ]}
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isProduct }}
              onPress={() => setType('product')}
              style={[
                styles.typeOption,
                isProduct && { backgroundColor: theme.colors.surfaceStrong },
              ]}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  {
                    color: isProduct ? theme.colors.text : theme.colors.textMuted,
                    fontWeight: isProduct ? '700' : '500',
                  },
                ]}
              >
                📦 Producto
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: !isProduct }}
              onPress={() => setType('service')}
              style={[
                styles.typeOption,
                !isProduct && { backgroundColor: theme.colors.surfaceStrong },
              ]}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  {
                    color: !isProduct ? theme.colors.text : theme.colors.textMuted,
                    fontWeight: !isProduct ? '700' : '500',
                  },
                ]}
              >
                🚗 Servicio
              </Text>
            </Pressable>
          </View>
        </FadeInView>

        {/* Formulario en GlassCard */}
        <FadeInView delay={160}>
          <GlassCard contentStyle={{ gap: theme.spacing.lg }}>
            {/* Nombre */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Nombre
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.separator,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  maxFontSizeMultiplier={1.4}
                  value={name}
                  onChangeText={setName}
                  placeholder={
                    isProduct
                      ? 'Ej. Canasta de 30 huevos'
                      : 'Ej. Viajes de InDriver'
                  }
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="sentences"
                  autoFocus
                />
              </View>
            </View>

            {/* Cantidad estimada al día */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Cantidad estimada al día ({isProduct ? 'unidades' : 'servicios'})
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.separator,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  maxFontSizeMultiplier={1.4}
                  value={String(quantity)}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '');
                    setQuantity(digits === '' ? 0 : parseInt(digits, 10));
                  }}
                  placeholder="1"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                  inputMode="numeric"
                />
              </View>
            </View>

            {/* Precio de venta o tarifa por unidad */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Precio de venta o tarifa por unidad (COP)
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.separator,
                  },
                ]}
              >
                <MoneyInput
                  value={pricePerUnit}
                  onChange={setPricePerUnit}
                  accessibilityLabel="Precio de venta por unidad"
                />
              </View>
            </View>

            {/* Inversión total (solo para productos) */}
            {isProduct ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Costo total de inversión para este lote (COP)
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      borderColor: theme.colors.separator,
                    },
                  ]}
                >
                  <MoneyInput
                    value={investment}
                    onChange={setInvestment}
                    accessibilityLabel="Inversión total"
                  />
                </View>
                <Text style={[styles.fieldHint, { color: theme.colors.textMuted }]}>
                  Lo que te costó comprar o producir todas las {quantity} unidades.
                </Text>
              </View>
            ) : null}

            {/* Meta de ganancia diaria */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Meta de ganancia diaria (COP - Opcional)
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.separator,
                  },
                ]}
              >
                <MoneyInput
                  value={dailyGoal}
                  onChange={setDailyGoal}
                  accessibilityLabel="Meta de ganancia diaria"
                />
              </View>
            </View>

            {/* Error si existe */}
            {errorMessage ? (
              <Text
                accessibilityRole="alert"
                style={[styles.error, { color: theme.colors.danger }]}
              >
                {errorMessage}
              </Text>
            ) : null}
          </GlassCard>
        </FadeInView>

        {/* Vista previa en tiempo real de la ganancia */}
        {pricePerUnit > 0 ? (
          <FadeInView delay={200}>
            <GlassCard
              contentStyle={[
                styles.previewCard,
                {
                  backgroundColor:
                    calculation.profit >= 0
                      ? theme.colors.successSoft
                      : theme.colors.dangerSoft,
                  borderColor:
                    calculation.profit >= 0
                      ? theme.colors.success
                      : theme.colors.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.previewTitle,
                  {
                    color:
                      calculation.profit >= 0
                        ? theme.colors.success
                        : theme.colors.danger,
                  },
                ]}
              >
                📊 Proyección estimada diaria
              </Text>

              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>
                  Ganancia libre estimada:
                </Text>
                <Text
                  style={[
                    styles.previewValueBold,
                    {
                      color:
                        calculation.profit >= 0
                          ? theme.colors.success
                          : theme.colors.danger,
                    },
                  ]}
                >
                  {formatCOP(Math.round(calculation.profit))}
                </Text>
              </View>

              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: theme.colors.textMuted }]}>
                  Ingreso bruto ({quantity} × {formatCOP(pricePerUnit)}):
                </Text>
                <Text style={[styles.previewValue, { color: theme.colors.text }]}>
                  {formatCOP(Math.round(calculation.revenue))}
                </Text>
              </View>

              {isProduct ? (
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.colors.textMuted }]}>
                    Costo unitario ({formatCOP(investment)} ÷ {quantity}):
                  </Text>
                  <Text style={[styles.previewValue, { color: theme.colors.text }]}>
                    {formatCOP(Math.round(calculation.costPerUnit))}
                  </Text>
                </View>
              ) : null}
            </GlassCard>
          </FadeInView>
        ) : null}

        {/* Botones de acción */}
        <FadeInView delay={240} style={styles.bottomActions}>
          <PrimaryButton
            label={saving ? 'Guardando…' : 'Guardar en mi negocio'}
            loading={saving}
            disabled={!name.trim() || quantity <= 0 || pricePerUnit <= 0}
            onPress={handleSave}
          />
          <PrimaryButton
            label="Cancelar"
            variant="ghost"
            disabled={saving}
            onPress={goBack}
          />
        </FadeInView>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'flex-start',
    gap: 16,
  },
  header: {
    gap: 8,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  overline: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 380,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionText: {
    fontSize: 14,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputContainer: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 18,
    lineHeight: 24,
  },
  previewCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 13,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewValueBold: {
    fontSize: 18,
    fontWeight: '800',
  },
  bottomActions: {
    gap: 8,
    width: '100%',
    marginTop: 8,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
