import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Category } from '../domain/budget';
import { formatCOP, parseCOPInput } from '../domain/money';
import { useBudgetStore, verifyExpenseFromState } from '../store/useBudgetStore';
import { useTheme } from '../theme';

export type SheetMode = 'gasto' | 'ingreso';

interface ExpenseSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (amount: number, category: string) => void;
  onSaveExpense?: (amount: number, category: string) => void;
  onSaveIncome?: (amount: number, description?: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  saving: boolean;
  initialMode?: SheetMode;
}

/**
 * Hoja unificada para registrar tanto gastos como ingresos adicionales.
 *
 * Diseñada para máxima simplicidad y accesibilidad (personas mayores o con vista cansada):
 * - Selección intuitiva de Gasto / Ingreso con pestañas de alto contraste (mínimo 48dp).
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
  initialMode = 'gasto',
}: ExpenseSheetProps) {
  const theme = useTheme();
  const config = useBudgetStore((state) => state.config);
  const expenses = useBudgetStore((state) => state.expenses);
  const incomes = useBudgetStore((state) => state.incomes);

  const [mode, setMode] = useState<SheetMode>(initialMode);
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
      { amount: parsedAmount, category: category as Category },
    );
  }, [amount, category, config, expenses, incomes, mode]);

  function handleClose() {
    setConfirmOverMargin(false);
    setDescription('');
    onClose();
  }

  function handleAttemptSave() {
    const digits = amount.replace(/\D/g, '');
    if (!digits || saving) {
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
      <View style={[styles.container, { backgroundColor: theme.colors.scrim }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar hoja de registro"
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.handle} />
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {/* Selector de Modo: Gasto vs Ingreso */}
            <View
              style={[
                styles.tabContainer,
                { backgroundColor: theme.colors.inputBackground },
              ]}
              accessibilityRole="radiogroup"
              accessibilityLabel="Tipo de registro: gasto o ingreso"
            >
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: mode === 'gasto' }}
                accessibilityLabel="Registrar un gasto"
                onPress={() => {
                  setMode('gasto');
                  setConfirmOverMargin(false);
                }}
                style={[
                  styles.tabButton,
                  mode === 'gasto' && {
                    backgroundColor: theme.colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        mode === 'gasto'
                          ? '#ffffff'
                          : theme.colors.textSecondary,
                      fontWeight: mode === 'gasto' ? '700' : '600',
                    },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  💸 Gasto
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: mode === 'ingreso' }}
                accessibilityLabel="Registrar un ingreso"
                onPress={() => {
                  setMode('ingreso');
                  setConfirmOverMargin(false);
                }}
                style={[
                  styles.tabButton,
                  mode === 'ingreso' && {
                    backgroundColor: theme.colors.success,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        mode === 'ingreso'
                          ? '#ffffff'
                          : theme.colors.textSecondary,
                      fontWeight: mode === 'ingreso' ? '700' : '600',
                    },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  💰 Ingreso
                </Text>
              </Pressable>
            </View>

            {/* Título claro */}
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              maxFontSizeMultiplier={1.4}
            >
              {mode === 'gasto' ? 'Registrar gasto' : 'Registrar ingreso adicional'}
            </Text>

            {/* Input del monto */}
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
                  onAmountChange(text);
                }}
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="number-pad"
                inputMode="numeric"
                autoFocus
                accessibilityLabel={`Monto del ${mode} en pesos colombianos`}
              />
              <Text
                style={[styles.unit, { color: theme.colors.textMuted }]}
                maxFontSizeMultiplier={1.3}
              >
                COP
              </Text>
            </View>

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
                  {verification.hardBlocked
                    ? '🛑 '
                    : verification.canProceedWithWarning
                      ? '⚠️ '
                      : '✓ '}
                  {verification.title}
                </Text>
                <Text
                  style={[styles.verificationMessage, { color: theme.colors.text }]}
                >
                  {verification.message}
                </Text>
              </View>
            ) : null}

            {/* Información orientativa en modo Ingreso */}
            {mode === 'ingreso' ? (
              <View
                style={[
                  styles.infoBox,
                  {
                    backgroundColor: theme.colors.successSoft,
                    borderColor: theme.colors.success,
                  },
                ]}
              >
                <Text
                  style={[styles.infoTitle, { color: theme.colors.success }]}
                >
                  ✨ ¿Qué pasa al guardar un ingreso?
                </Text>
                <Text
                  style={[styles.infoMessage, { color: theme.colors.text }]}
                >
                  Este dinero se suma de inmediato a tu disponible mensual y aumenta la cuota diaria que puedes gastar hoy y los días siguientes.
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
                  {[
                    { id: 'comida', label: '🍽️ Comida' },
                    { id: 'transporte', label: '🚌 Transporte' },
                    { id: 'ocio', label: '🎉 Ocio' },
                    { id: 'otros', label: '🛒 Otros' },
                  ].map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: category === item.id }}
                      onPress={() => onCategoryChange(item.id)}
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
            ) : (
              /* Campo de descripción en modo Ingreso */
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
                  onChangeText={setDescription}
                  placeholder="Ej. Venta, trabajo extra, regalo..."
                  placeholderTextColor={theme.colors.textMuted}
                  maxLength={60}
                  accessibilityLabel="Descripción del ingreso"
                />
              </View>
            )}

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
                  ⚠️ El gasto supera tu cuota de hoy
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
                        { color: '#ffffff', fontSize: 14 },
                      ]}
                    >
                      Sí, guardar
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Botón principal de guardar */}
            {!confirmOverMargin ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  mode === 'gasto' ? 'Guardar gasto' : 'Guardar ingreso'
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
                        : '#ffffff',
                    },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  {saving
                    ? 'Guardando...'
                    : mode === 'gasto'
                      ? 'Guardar gasto'
                      : 'Guardar ingreso'}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#88888844',
    marginBottom: 16,
  },
  body: {
    gap: 18,
    paddingBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 16,
    lineHeight: 22,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
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
  verificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  verificationMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  infoMessage: {
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
