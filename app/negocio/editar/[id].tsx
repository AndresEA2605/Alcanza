import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import {
  Image,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useBusinessStore } from '../../../src/store/useBusinessStore';
import { useTheme } from '../../../src/theme';
import { BackButton } from '../../../src/ui/BackButton';
import { FadeInView } from '../../../src/ui/FadeInView';
import { GlassCard } from '../../../src/ui/GlassCard';
import { LoadingState } from '../../../src/ui/LoadingState';
import { MoneyInput } from '../../../src/ui/MoneyInput';
import { PrimaryButton } from '../../../src/ui/PrimaryButton';
import { Screen } from '../../../src/ui/Screen';
import {
  normalizeBusinessGoal,
  type BusinessGoalPeriod,
  type BusinessItem,
} from '../../../src/domain/business';

type BusinessFormType = 'product' | 'service';

/**
 * Pantalla para editar un producto o servicio existente.
 */
export default function EditarNegocioScreen() {
  const theme = useTheme();
  const s = styles(theme);
  const router = useRouter();
  const { id: itemId } = useLocalSearchParams<{ id: string }>();
  const error = useBusinessStore((state) => state.error);
  const status = useBusinessStore((state) => state.status);
  const initialize = useBusinessStore((state) => state.initialize);
  const refresh = useBusinessStore((state) => state.refresh);

  useEffect(() => {
    if (status === 'idle') {
      void initialize();
    }
  }, [initialize, status]);

  // Buscar el ítem en el estado
  const item = useBusinessStore((state) =>
    state.items.find((i: BusinessItem) => i.id === itemId),
  );

  if (status === 'idle' || status === 'loading') {
    return <LoadingState key={status} title="Cargando producto…" />;
  }

  if (status === 'error' && !item) {
    return (
      <LoadingState
        key={status}
        title="Cargando producto…"
        error={error}
        onRetry={() => void refresh()}
      />
    );
  }

  if (!item || !itemId) {
    return (
      <Screen contentStyle={s.centered}>
        <Text style={[s.title, { color: theme.colors.text }]}>
          Producto no encontrado
        </Text>
        <PrimaryButton
          label="Volver"
          onPress={() => router.replace('/negocio')}
        />
      </Screen>
    );
  }

  return <EditForm item={item} itemId={itemId} error={error} theme={theme} styles={s} />;
}

/** Formulario de edición. Siempre recibe un ítem válido. */
function EditForm({
  item,
  itemId,
  error,
  theme,
  styles: s,
}: {
  item: BusinessItem;
  itemId: string;
  error: string | null;
  theme: ReturnType<typeof useTheme>;
  styles: ReturnType<typeof styles>;
}) {
  const updateItem = useBusinessStore((state) => state.updateItem);
  const deleteItem = useBusinessStore((state) => state.deleteItem);
  const router = useRouter();

  const [type, setType] = useState<BusinessFormType>(item.type);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [quantity, setQuantity] = useState(item.quantity);
  const [pricePerUnit, setPricePerUnit] = useState(item.pricePerUnit);
  const [investment, setInvestment] = useState(item.investment);
  const [goalAmount, setGoalAmount] = useState(item.goalAmount);
  const [goalPeriod, setGoalPeriod] = useState<BusinessGoalPeriod>(item.goalPeriod);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorState] = useState<string | null>(null);

  // Refs para capturar valores actuales al guardar
  const quantityRef = useRef<number>(item.quantity);
  const priceRef = useRef<number>(item.pricePerUnit);
  const investmentRef = useRef<number>(item.investment);
  const goalAmountRef = useRef<number>(item.goalAmount);
  const goalPeriodRef = useRef<BusinessGoalPeriod>(item.goalPeriod);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/negocio');
    }
  }

  async function handleSave() {
    if (saving) {
      return;
    }

    if (!name.trim()) {
      setErrorState('El nombre es obligatorio.');
      return;
    }

    if (!quantityRef.current || quantityRef.current <= 0) {
      setErrorState('La cantidad debe ser mayor que 0.');
      return;
    }

    setSaving(true);

    try {
      await updateItem(itemId, {
        name: name.trim(),
        description: description.trim(),
        type,
        quantity: quantityRef.current,
        pricePerUnit: priceRef.current,
        investment: type === 'product' ? investmentRef.current : 0,
        dailyGoal: normalizeBusinessGoal(
          goalAmountRef.current,
          goalPeriodRef.current,
        ),
        goalAmount: goalAmountRef.current,
        goalPeriod: goalPeriodRef.current,
      });
      router.replace('/negocio');
    } catch {
      // El store ya establece el error.
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const doDelete = async () => {
      try {
        await deleteItem(itemId);
        router.replace('/negocio' as any);
      } catch {
        // El store ya establece el error.
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('¿Estás seguro de eliminar este producto o servicio?')) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Eliminar producto o servicio',
        `¿Deseas eliminar "${item.name}"? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => void doDelete() },
        ],
      );
    }
  }

  return (
    <Screen avoidKeyboard contentStyle={s.content}>
      <FadeInView delay={0} style={s.header}>
        <BackButton onPress={goBack} />
      </FadeInView>

      <View style={s.center}>
        <FadeInView delay={80}>
          <Text
            accessibilityRole="header"
            style={[s.title, { color: theme.colors.text }]}
          >
            Editar {item.name}
          </Text>
        </FadeInView>

        {item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={s.editImage}
            accessibilityLabel={`Imagen de ${item.name}`}
          />
        ) : null}

        <FadeInView delay={140}>
          <View style={s.typeSelector}>
            <TypeChip
              label="Producto"
              value="product"
              selected={type === 'product'}
              onPress={() => setType('product')}
              theme={theme}
              styles={s}
            />
            <TypeChip
              label="Servicio"
              value="service"
              selected={type === 'service'}
              onPress={() => setType('service')}
              theme={theme}
              styles={s}
            />
          </View>
        </FadeInView>

        <FadeInView delay={200} style={{ marginTop: theme.spacing.xxl }}>
          <GlassCard contentStyle={{ gap: theme.spacing.lg }}>
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: theme.colors.textSecondary }]}>
                Nombre
              </Text>
              <View style={s.inputContainer}>
                <TextInput
                  style={[s.input, { color: theme.colors.text }]}
                  maxFontSizeMultiplier={1.4}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: theme.colors.textSecondary }]}>
                Descripción
              </Text>
              <View style={s.inputContainer}>
                <TextInput
                  style={[s.input, s.descriptionInput, { color: theme.colors.text }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Detalles del producto o servicio"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  maxLength={500}
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: theme.colors.textSecondary }]}>
                Cantidad
              </Text>
              <View style={s.inputContainer}>
                <TextInput
                  style={[s.input, { color: theme.colors.text }]}
                  maxFontSizeMultiplier={1.4}
                  value={String(quantity)}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '');
                    const val = digits === '' ? 0 : parseInt(digits, 10);
                    setQuantity(val);
                    quantityRef.current = val;
                  }}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  inputMode="numeric"
                />
              </View>
            </View>

            {type === 'product' ? (
              <>
                <View style={s.fieldGroup}>
                  <Text style={[s.fieldLabel, { color: theme.colors.textSecondary }]}>
                    Inversión total (COP)
                  </Text>
                  <View style={s.inputContainer}>
                    <MoneyInput
                      value={investment}
                      onChange={(v) => {
                        setInvestment(v);
                        investmentRef.current = v;
                      }}
                      accessibilityLabel="Inversión total"
                    />
                  </View>
                </View>

                <View style={s.fieldGroup}>
                  <Text style={[s.fieldLabel, { color: theme.colors.textSecondary }]}>
                    Precio de venta por unidad (COP)
                  </Text>
                  <View style={s.inputContainer}>
                    <MoneyInput
                      value={pricePerUnit}
                      onChange={(v) => {
                        setPricePerUnit(v);
                        priceRef.current = v;
                      }}
                      accessibilityLabel="Precio de venta"
                    />
                  </View>
                </View>
              </>
            ) : (
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Ingreso por servicio (COP)
                </Text>
                <View style={s.inputContainer}>
                  <MoneyInput
                    value={pricePerUnit}
                    onChange={(v) => {
                      setPricePerUnit(v);
                      priceRef.current = v;
                    }}
                    accessibilityLabel="Ingreso por servicio"
                  />
                </View>
              </View>
            )}

            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: theme.colors.textSecondary }]}>
                Meta de ganancia neta
              </Text>
              <View style={s.goalPeriodRow}>
                {([
                  ['daily', 'Diaria'],
                  ['monthly', 'Mensual'],
                  ['yearly', 'Anual'],
                ] as const).map(([period, label]) => {
                  const selected = goalPeriod === period;
                  return (
                    <Pressable
                      key={period}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setGoalPeriod(period);
                        goalPeriodRef.current = period;
                      }}
                      style={[
                        s.goalPeriodButton,
                        {
                          backgroundColor: selected
                            ? theme.colors.accent
                            : theme.colors.inputBackground,
                          borderColor: selected
                            ? theme.colors.accent
                            : theme.colors.separator,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.goalPeriodLabel,
                          {
                            color: selected
                              ? theme.colors.onAccent
                              : theme.colors.text,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={s.inputContainer}>
                <MoneyInput
                  value={goalAmount}
                  onChange={(v) => {
                    setGoalAmount(v);
                    goalAmountRef.current = v;
                  }}
                  accessibilityLabel={`Meta de ganancia ${goalPeriod}`}
                />
              </View>
            </View>

            {errorMessage ? (
              <FadeInView delay={300}>
                <Text
                  accessibilityRole="alert"
                  style={[s.error, { color: theme.colors.danger }]}
                >
                  {errorMessage}
                </Text>
              </FadeInView>
            ) : null}

            {error ? (
              <FadeInView delay={300}>
                <Text
                  accessibilityRole="alert"
                  style={[s.error, { color: theme.colors.danger }]}
                >
                  {error}
                </Text>
              </FadeInView>
            ) : null}
          </GlassCard>
        </FadeInView>
      </View>

      <FadeInView delay={340} style={s.bottom}>
        <PrimaryButton
          label="Guardar cambios"
          loading={saving}
          disabled={!name.trim() || quantity <= 0}
          onPress={handleSave}
        />
        <PrimaryButton
          label="Eliminar"
          variant="ghost"
          disabled={saving}
          onPress={handleDelete}
        />
        <PrimaryButton
          label="Cancelar"
          variant="ghost"
          disabled={saving}
          onPress={goBack}
        />
      </FadeInView>
    </Screen>
  );
}

function TypeChip({
  label,
  value,
  selected,
  onPress,
  theme,
  styles,
}: {
  label: string;
  value: BusinessFormType;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  styles: any;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.typeChip,
        {
          backgroundColor: selected ? theme.colors.accent : 'transparent',
          borderColor: selected ? theme.colors.accent : theme.colors.separator,
        },
      ]}
    >
      <Text
        style={[
          styles.typeChipLabel,
          {
            color: selected ? theme.colors.onAccent : theme.colors.text,
            fontWeight: selected ? '700' : '600',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function styles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    content: {
      justifyContent: 'space-between',
      gap: 24,
    },
    header: {
      gap: 14,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
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
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    typeSelector: {
      flexDirection: 'row',
      gap: 10,
    },
    editImage: {
      width: 96,
      height: 96,
      borderRadius: 18,
      backgroundColor: theme.colors.inputBackground,
    },
    typeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
    },
    typeChipLabel: {
      fontSize: 16,
      lineHeight: 22,
      textAlign: 'center',
    },
    fieldGroup: {
      gap: 8,
    },
    fieldLabel: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    inputContainer: {
      backgroundColor: theme.colors.inputBackground,
      borderColor: theme.colors.separator,
      borderRadius: theme.radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    input: {
      fontSize: 20,
      lineHeight: 26,
    },
    descriptionInput: {
      minHeight: 92,
      textAlignVertical: 'top',
    },
    goalPeriodRow: {
      flexDirection: 'row',
      gap: 8,
    },
    goalPeriodButton: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
    },
    goalPeriodLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    bottom: {
      gap: 4,
      width: '100%',
    },
    error: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
}
