import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { BusinessType } from '../../src/domain/business';
import { persistProductImage } from '../../src/data/productImageStorage';
import { useBusinessStore } from '../../src/store/useBusinessStore';
import { useTheme } from '../../src/theme';
import { BackButton } from '../../src/ui/BackButton';
import { GlassCard } from '../../src/ui/GlassCard';
import { HapticPressable as Pressable } from '../../src/ui/HapticPressable';
import { MoneyInput } from '../../src/ui/MoneyInput';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { Screen } from '../../src/ui/Screen';
import { StepIndicator } from '../../src/ui/StepIndicator';

const STEPS = [
  { title: 'Cuéntanos qué vendes', subtitle: 'Empecemos con lo básico.' },
  { title: 'Agrega una imagen', subtitle: 'Una foto ayuda a reconocerlo rápido.' },
  {
    title: 'Precio de venta',
    subtitle: 'Define el precio de este producto o servicio.',
  },
  {
    title: 'Registra tu inversión',
    subtitle: 'Anota cuánto te cuesta producir o comprar una unidad.',
  },
] as const;

export default function NuevoNegocioScreen() {
  const theme = useTheme();
  const addItem = useBusinessStore((state) => state.addItem);

  const [step, setStep] = useState(1);
  const [type, setType] = useState<BusinessType>('product');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [investment, setInvestment] = useState(0);
  const [inCatalog, setInCatalog] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProduct = type === 'product';
  const lastStep = isProduct ? STEPS.length : STEPS.length - 1;

  function goBack() {
    if (step > 1) {
      setStep((current) => current - 1);
      setErrorMessage(null);
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/negocio');
    }
  }

  function continueToNextStep() {
    setErrorMessage(null);

    if (step === 1 && !name.trim()) {
      setErrorMessage('Escribe el nombre para continuar.');
      return;
    }

    if (step === 3) {
      if (pricePerUnit <= 0) {
        setErrorMessage('Agrega un precio de venta por unidad.');
        return;
      }
    }

    if (step === lastStep) {
      void saveItem();
      return;
    }

    if (step === 3 && !isProduct) {
      void saveItem();
      return;
    }

    setStep((current) => current + 1);
  }

  async function pickImage() {
    setLoadingImage(true);
    setErrorMessage(null);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        base64: Platform.OS === 'web',
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (Platform.OS === 'web') {
        if (!asset.base64) {
          throw new Error('No pude leer la imagen. Prueba con otra foto.');
        }
        setImageUri(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
      } else {
        setImageUri(asset.uri);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No pude abrir tus fotos. Intenta de nuevo.',
      );
    } finally {
      setLoadingImage(false);
    }
  }

  async function saveItem() {
    if (saving) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const savedImageUri = await persistProductImage(imageUri);
      await addItem({
        name: name.trim(),
        description: description.trim(),
        imageUri: savedImageUri,
        type,
        quantity: 1,
        pricePerUnit,
        investment: isProduct ? investment : 0,
        dailyGoal: 0,
        goalAmount: 0,
        goalPeriod: 'daily',
        inCatalog,
      });
      router.replace('/negocio');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No pude guardar el producto. Intenta de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  const stepContent = [
    <GlassCard key="details" contentStyle={styles.cardContent}>
      <View
        style={[
          styles.typeSelector,
          { backgroundColor: theme.colors.inputBackground },
        ]}
      >
        {(['product', 'service'] as const).map((value) => {
          const selected = type === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setType(value)}
              style={[
                styles.typeOption,
                selected && { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  {
                    color: selected
                      ? theme.colors.text
                      : theme.colors.textSecondary,
                    fontWeight: selected ? '700' : '500',
                  },
                ]}
              >
                {value === 'product' ? 'Producto' : 'Servicio'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Field label="Nombre" theme={theme}>
        <TextInput
          style={[
            styles.textInput,
            {
              color: theme.colors.text,
              borderColor: theme.colors.separator,
              backgroundColor: theme.colors.inputBackground,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder={isProduct ? 'Ej. Café molido' : 'Ej. Asesoría'}
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="sentences"
          maxLength={100}
          returnKeyType="next"
        />
      </Field>

      <Field label="Descripción (opcional)" theme={theme}>
        <TextInput
          style={[
            styles.textInput,
            styles.descriptionInput,
            {
              color: theme.colors.text,
              borderColor: theme.colors.separator,
              backgroundColor: theme.colors.inputBackground,
            },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Detalles que quieras recordar"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="sentences"
          multiline
          maxLength={500}
        />
      </Field>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: inCatalog }}
        accessibilityLabel="Mostrar en catálogo de mi tienda"
        onPress={() => setInCatalog((prev) => !prev)}
        style={[
          styles.catalogToggleRow,
          {
            backgroundColor: inCatalog ? theme.colors.accentSoft : theme.colors.inputBackground,
            borderColor: inCatalog ? theme.colors.accent : theme.colors.separator,
          },
        ]}
      >
        <View style={styles.catalogToggleTextCol}>
          <Text style={[styles.catalogToggleTitle, { color: theme.colors.text }]}>
            🛍️ Mostrar en mi catálogo
          </Text>
          <Text style={[styles.catalogToggleSubtitle, { color: theme.colors.textSecondary }]}>
            {inCatalog
              ? 'Visible en tu tienda para compartir por link o WhatsApp.'
              : 'Oculto. Solo para tus cálculos internos de negocio.'}
          </Text>
        </View>
        <View
          style={[
            styles.checkboxBase,
            inCatalog && { backgroundColor: theme.colors.accent },
            { borderColor: inCatalog ? theme.colors.accent : theme.colors.separator },
          ]}
        >
          {inCatalog && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>
    </GlassCard>,

    <GlassCard key="image" contentStyle={styles.imageCard}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[
            styles.productImage,
            { backgroundColor: theme.colors.inputBackground },
          ]}
        />
      ) : (
        <View
          style={[
            styles.imagePlaceholder,
            {
              backgroundColor: theme.colors.inputBackground,
              borderColor: theme.colors.separator,
            },
          ]}
        >
          <Text style={[styles.imagePlaceholderTitle, { color: theme.colors.text }]}>
            Sin imagen
          </Text>
          <Text style={[styles.imagePlaceholderHint, { color: theme.colors.textMuted }]}>
            Puedes agregar una foto desde tu dispositivo.
          </Text>
        </View>
      )}
      <PrimaryButton
        label={loadingImage ? 'Abriendo fotos…' : imageUri ? 'Cambiar imagen' : 'Elegir imagen'}
        variant="secondary"
        loading={loadingImage}
        disabled={loadingImage}
        onPress={() => void pickImage()}
      />
      {imageUri ? (
        <PrimaryButton
          label="Quitar imagen"
          variant="ghost"
          disabled={loadingImage}
          onPress={() => setImageUri(null)}
        />
      ) : null}
      <Text style={[styles.optionalNote, { color: theme.colors.textMuted }]}>
        Este paso es opcional. Puedes continuar sin una foto.
      </Text>
    </GlassCard>,

    <GlassCard key="price" contentStyle={styles.cardContent}>
      <Field
        label={isProduct ? 'Precio de venta del producto' : 'Precio por servicio'}
        theme={theme}
      >
        <MoneyInput
          value={pricePerUnit}
          onChange={setPricePerUnit}
          accessibilityLabel="Precio de venta en pesos colombianos"
        />
      </Field>
    </GlassCard>,

    <GlassCard key="investment" contentStyle={styles.cardContent}>
      {isProduct ? (
        <>
          <Text
            style={[
              styles.stepIntro,
              { color: theme.colors.textSecondary },
            ]}
          >
            Registra cuánto te cuesta producir o comprar una unidad.
          </Text>
          <Field label="Costo o inversión por unidad (opcional)" theme={theme}>
            <MoneyInput
              value={investment}
              onChange={setInvestment}
              accessibilityLabel="Costo o inversión por unidad"
            />
          </Field>
        </>
      ) : null}
    </GlassCard>,
  ];

  return (
    <Screen scroll={false} avoidKeyboard contentStyle={styles.screenContent}>
      <View style={styles.topBar}>
        <BackButton onPress={goBack} />
        <Text style={[styles.stepCount, { color: theme.colors.textMuted }]}>
          Paso {step} de {lastStep}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            step === lastStep
              ? `Guardar ${isProduct ? 'producto' : 'servicio'}`
              : 'Continuar al siguiente paso'
          }
          accessibilityHint={
            step === lastStep
              ? 'Guarda el producto o servicio'
              : 'Avanza sin bajar hasta el final de la pantalla'
          }
          disabled={saving || loadingImage}
          onPress={continueToNextStep}
          style={({ pressed }) => [
            styles.topAdvanceButton,
            {
              backgroundColor: theme.colors.accentSoft,
              opacity: saving || loadingImage ? 0.45 : pressed ? 0.7 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <Text
              style={[
                styles.topAdvanceArrow,
                { color: theme.colors.accent },
              ]}
            >
              →
            </Text>
          )}
        </Pressable>
      </View>

      <StepIndicator total={lastStep} current={step} />

      <ScrollView
        style={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heading}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.colors.text }]}
          >
            {STEPS[step - 1].title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {STEPS[step - 1].subtitle}
          </Text>
        </View>

        {stepContent[step - 1]}

        {errorMessage ? (
          <Text
            accessibilityRole="alert"
            style={[styles.error, { color: theme.colors.danger }]}
          >
            {errorMessage}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            label={
              step === lastStep
                ? saving
                  ? 'Guardando…'
                  : isProduct
                    ? 'Guardar producto'
                    : 'Guardar servicio'
                : step === 2 && !imageUri
                  ? 'Continuar sin imagen'
                  : 'Continuar'
            }
            loading={saving}
            disabled={saving || loadingImage}
            onPress={continueToNextStep}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  theme,
  children,
}: {
  label: string;
  theme: ReturnType<typeof useTheme>;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'flex-start',
    gap: 20,
  },
  formScroll: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  topAdvanceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAdvanceArrow: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
  stepIntro: {
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 24,
    paddingTop: 8,
    paddingBottom: 36,
  },
  heading: {
    gap: 6,
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
  },
  cardContent: {
    gap: 22,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  typeOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionText: {
    fontSize: 15,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  textInput: {
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    fontSize: 17,
    lineHeight: 23,
  },
  descriptionInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  catalogToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  catalogToggleTextCol: {
    flex: 1,
    gap: 4,
  },
  catalogToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  catalogToggleSubtitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  checkboxBase: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  imageCard: {
    alignItems: 'stretch',
    gap: 14,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 6,
  },
  imagePlaceholderTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  imagePlaceholderHint: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 19,
  },
  optionalNote: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 8,
    marginTop: 'auto',
  },
});
