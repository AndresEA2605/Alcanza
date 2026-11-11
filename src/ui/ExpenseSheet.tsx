import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable as NativePressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '../domain/budget';
import { formatCOP, formatCOPInput, parseCOPInput } from '../domain/money';
import { useBudgetStore, verifyExpenseFromState } from '../store/useBudgetStore';
import { useTheme } from '../theme';
import { HapticPressable as Pressable } from './HapticPressable';
import { MovementTypeSelector, type SheetMode } from './MovementTypeSelector';

export type { SheetMode } from './MovementTypeSelector';

const CATEGORIES: readonly { id: Category; label: string }[] = [
  { id: 'comida', label: 'Comida' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'ocio', label: 'Ocio' },
  { id: 'otros', label: 'Otros' },
];

interface ExpenseSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (amount: number, category: Category) => void;
  onSaveExpense?: (amount: number, category: Category) => void;
  onSaveIncome?: (amount: number, description?: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  category: Category;
  onCategoryChange: (category: Category) => void;
  saving: boolean;
  initialMode?: SheetMode | null;
  errorMessage?: string | null;
  onDismissError?: () => void;
}

/**
 * Hoja unificada para registrar tanto gastos como ingresos adicionales.
 *
 * Diseñada para máxima simplicidad y accesibilidad (personas mayores o con vista cansada):
 * - Selección explícita de Gasto / Ingreso antes de introducir el monto.
 * - Tipografía amplia y legible (18-42px).
 * - Verificación en tiempo real del margen razonable para gastos.
 * - Registro directo de ingresos que suman inmediatamente al dinero disponible.
 */
export function ExpenseSheet({
  visible,
  onClose,
  onSave,
  onSaveExpense,
  onSaveIncome,
  amount,
  onAmountChange,
  category,
  onCategoryChange,
  saving,
  initialMode = null,
  errorMessage,
  onDismissError,
}: ExpenseSheetProps) {
  const theme = useTheme();
  const config = useBudgetStore((state) => state.config);
  const expenses = useBudgetStore((state) => state.expenses);
  const incomes = useBudgetStore((state) => state.incomes);

  const [mode, setMode] = useState<SheetMode | null>(initialMode);
  const [description, setDescription] = useState('');
  const [confirmOverMargin, setConfirmOverMargin] = useState(false);
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setMode(initialMode);
      setConfirmOverMargin(false);
      setDescription('');
    }
  }

  // Verificación en dominio del monto actual (solo en modo gasto)
  const verification = useMemo(() => {
    if (mode !== 'gasto') {
      return null;
    }
    const digits = amount.replace(/\D/g, '');
    if (!digits) {
      return null;
    }
    const parsedAmount = parseInt(digits, 10);
    if (!parsedAmount || parsedAmount <= 0) {
      return null;
    }

    return verifyExpenseFromState(
      { config, expenses, incomes },
      { amount: parsedAmount, category },
    );
  }, [amount, category, config, expenses, incomes, mode]);

  function handleClose() {
    setConfirmOverMargin(false);
    setDescription('');
    onClose();
  }

  function handleAttemptSave() {
    const digits = amount.replace(/\D/g, '');
    if (!mode || !digits || saving) {
      return;
    }

    const parsedAmount = parseCOPInput(digits);

    if (mode === 'ingreso') {
      if (onSaveIncome) {
        onSaveIncome(parsedAmount, description.trim() || undefined);
      }
      return;
    }

    // Modo Gasto:
    // Si está bloqueado estrictamente (ej. excede fondos totales del mes), no guardar
    if (verification?.hardBlocked) {
      return;
    }

    // Si supera el margen diario pero tiene fondos en el mes, pedir confirmación
    if (verification?.canProceedWithWarning && !confirmOverMargin) {
      setConfirmOverMargin(true);
      return;
    }

    setConfirmOverMargin(false);
    if (onSaveExpense) {
      onSaveExpense(parsedAmount, category);
    } else if (onSave) {
      onSave(parsedAmount, category);
    }
  }

  const isSaveDisabled =
    !mode ||
    !amount.replace(/\D/g, '') ||
    saving ||
    (mode === 'gasto' && verification?.hardBlocked === true);

  return (
    <Modal
      visible={visible}
      transparent
      onRequestClose={handleClose}
      animationType="fade"
      hardwareAccelerated
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoiding}
      >
        <SafeAreaView
          style={[styles.container, { backgroundColor: theme.colors.scrim }]}
          edges={['top', 'left', 'right', 'bottom']}
        >
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar hoja de registro"
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <View
            style={[
              styles.titleBar,
              { borderBottomColor: theme.colors.separator },
            ]}
          >
            <View style={styles.titleGroup}>
              <Text
                style={[styles.eyebrow, { color: theme.colors.textMuted }]}
              >
                MOVIMIENTOS
              </Text>
              <Text
                accessibilityRole="header"
                style={[styles.sheetTitle, { color: theme.colors.text }]}
              >
                Nuevo registro
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar registro"
              hitSlop={8}
              onPress={handleClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: theme.colors.separator,
                },
              ]}
            >
              <Text style={[styles.closeLabel, { color: theme.colors.text }]}>
                ×
              </Text>
            </Pressable>
          </View>
          <View style={styles.selectorSection}>
            <MovementTypeSelector
              mode={mode}
              onChange={(nextMode) => {
                setMode(nextMode);
                setConfirmOverMargin(false);
                onDismissError?.();
              }}
            />
          </View>

          <ScrollView
            style={styles.form}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {/* Input del monto */}
            {mode !== null ? (
              <View style={styles.amountSection}>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  Monto del {mode}
                </Text>
                <View style={styles.row}>
                  <Text
                    style={[
                      styles.currency,
                      {
                        color:
                          mode === 'ingreso'
                            ? theme.colors.success
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    $
                  </Text>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    maxFontSizeMultiplier={1.3}
                    value={amount}
                    onChangeText={(text) => {
                      setConfirmOverMargin(false);
                      onAmountChange(formatCOPInput(text));
                      onDismissError?.();
                    }}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    accessibilityLabel={`Monto del ${mode} en pesos colombianos`}
                  />
                  <Text
                    style={[styles.unit, { color: theme.colors.textMuted }]}
                    maxFontSizeMultiplier={1.3}
                  >
                    COP
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Banner reactivo de verificación del margen (Modo Gasto) */}
            {mode === 'gasto' && verification ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.verificationBox,
                  {
                    backgroundColor:
                      verification.hardBlocked
                        ? theme.colors.dangerSoft
                        : verification.canProceedWithWarning
                          ? theme.colors.warningSoft
                          : theme.colors.successSoft,
                    borderColor:
                      verification.hardBlocked
                        ? theme.colors.danger
                        : verification.canProceedWithWarning
                          ? theme.colors.warning
                          : theme.colors.success,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.verificationTitle,
                    {
                      color:
                        verification.hardBlocked
                          ? theme.colors.danger
                          : verification.canProceedWithWarning
                            ? theme.colors.warning
                            : theme.colors.success,
                    },
                  ]}
                >
                  {verification.title}
                </Text>
                <Text
                  style={[styles.verificationMessage, { color: theme.colors.text }]}
                >
                  {verification.message}
                </Text>
              </View>
            ) : null}

            {/* Selector de Categorías (solo en modo Gasto) */}
            {mode === 'gasto' ? (
              <View style={styles.categoryRow}>
                <Text
                  style={[styles.subtitle, { color: theme.colors.textSecondary }]}
                >
                  Categoría
                </Text>
                <View style={styles.chips}>
                  {CATEGORIES.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: category === item.id }}
                      onPress={() => {
                        onCategoryChange(item.id);
                        onDismissError?.();
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            category === item.id
                              ? theme.colors.accentSoft
                              : 'transparent',
                          borderColor:
                            category === item.id
                              ? theme.colors.accent
                              : theme.colors.separator,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          {
                            color:
                              category === item.id
                                ? theme.colors.accent
                                : theme.colors.textSecondary,
                            fontWeight: category === item.id ? '700' : '600',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {mode === 'ingreso' ? (
              <View style={styles.descriptionRow}>
                <Text
                  style={[styles.subtitle, { color: theme.colors.textSecondary }]}
                >
                  ¿De dónde vino este dinero? (opcional)
                </Text>
                <TextInput
                  style={[
                    styles.descriptionInput,
                    {
                      color: theme.colors.text,
                      backgroundColor: theme.colors.inputBackground,
                      borderColor: theme.colors.separator,
                    },
                  ]}
                  value={description}
                  onChangeText={(text) => {
                    setDescription(text);
                    onDismissError?.();
                  }}
                  placeholder="Ej. Venta, trabajo extra, regalo..."
                  placeholderTextColor={theme.colors.textMuted}
                  maxLength={60}
                  accessibilityLabel="Descripción del ingreso"
                />
              </View>
            ) : null}

            {/* Confirmación explícita si supera el margen diario (Modo Gasto) */}
            {mode === 'gasto' &&
            confirmOverMargin &&
            verification?.canProceedWithWarning ? (
              <View
                style={[
                  styles.confirmContainer,
                  {
                    backgroundColor: theme.colors.warningSoft,
                    borderColor: theme.colors.warning,
                  },
                ]}
              >
                <Text
                  style={[styles.confirmTitle, { color: theme.colors.warning }]}
                >
                  El gasto supera tu cuota de hoy
                </Text>
                <Text
                  style={[styles.confirmText, { color: theme.colors.text }]}
                >
                  Si lo registras, tu disponible diario para los siguientes días
                  bajará a{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {formatCOP(
                      Math.round(
                        verification.impact?.tomorrowAfter ?? 0,
                      ),
                    )}
                  </Text>
                  . ¿Deseas guardarlo de todos modos?
                </Text>
                <View style={styles.confirmButtons}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar gasto"
                    onPress={() => setConfirmOverMargin(false)}
                    style={[
                      styles.secondaryActionButton,
                      { borderColor: theme.colors.separator },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryActionText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Corregir monto
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Confirmar gasto fuera de margen"
                    onPress={handleAttemptSave}
                    style={[
                      styles.confirmActionButton,
                      { backgroundColor: theme.colors.warning },
                    ]}
                  >
                    <Text
                      style={[
                        styles.saveLabel,
                        { color: theme.colors.onWarning, fontSize: 14 },
                      ]}
                    >
                      Sí, guardar
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {errorMessage ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: theme.colors.dangerSoft,
                    borderColor: theme.colors.danger,
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Botón principal de guardar */}
            {!confirmOverMargin ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  mode === 'gasto'
                    ? 'Guardar gasto'
                    : mode === 'ingreso'
                      ? 'Guardar ingreso'
                      : 'Selecciona un tipo de movimiento'
                }
                disabled={isSaveDisabled}
                onPress={handleAttemptSave}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: isSaveDisabled
                      ? theme.colors.separator
                      : mode === 'ingreso'
                        ? theme.colors.success
                        : theme.colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.saveLabel,
                    {
                      color: isSaveDisabled
                        ? theme.colors.textMuted
                        : mode === 'ingreso'
                          ? theme.colors.onSuccess
                          : theme.colors.onAccent,
                    },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {saving
                    ? 'Guardando...'
                    : mode === 'gasto'
                      ? 'Guardar gasto'
                      : mode === 'ingreso'
                        ? 'Guardar ingreso'
                        : 'Selecciona un tipo'}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sheet: {
    width: '100%',
    flexShrink: 1,
    maxHeight: '94%',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  titleBar: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    gap: 12,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '400',
  },
  selectorSection: {
    paddingTop: 16,
  },
  form: {
    flexShrink: 1,
    minHeight: 0,
  },
  body: {
    gap: 18,
    paddingTop: 20,
    paddingBottom: 20,
  },
  amountSection: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currency: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '700',
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  verificationBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  verificationMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  categoryRow: {
    gap: 10,
  },
  descriptionRow: {
    gap: 10,
  },
  descriptionInput: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  confirmContainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 19,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmActionButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 6,
  },
  saveLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
});
