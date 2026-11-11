import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  generateCatalogPdf,
  generateProductPdf,
  sharePdfFile,
} from '../../src/data/catalogPdfService';
import {
  formatProductShareText,
  type BusinessItem,
} from '../../src/domain/business';
import { formatCOP } from '../../src/domain/money';
import { useBusinessStore } from '../../src/store/useBusinessStore';
import { useTheme } from '../../src/theme';
import { BackButton } from '../../src/ui/BackButton';
import { EmptyState } from '../../src/ui/EmptyState';
import { FadeInView } from '../../src/ui/FadeInView';
import { GlassCard } from '../../src/ui/GlassCard';
import { HapticPressable as Pressable } from '../../src/ui/HapticPressable';
import { LoadingState } from '../../src/ui/LoadingState';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { SecureProductImage } from '../../src/ui/business/SecureProductImage';

type StoreFilterType = 'all' | 'product' | 'service';

export default function TiendaScreen() {
  const theme = useTheme();
  const { id: targetId } = useLocalSearchParams<{ id?: string }>();

  const items = useBusinessStore((state) => state.items);
  const status = useBusinessStore((state) => state.status);
  const error = useBusinessStore((state) => state.error);
  const initialize = useBusinessStore((state) => state.initialize);
  const refresh = useBusinessStore((state) => state.refresh);
  const toggleCatalogItem = useBusinessStore((state) => state.toggleCatalogItem);

  const storeName = useBusinessStore((state) => state.storeName);
  const sellerName = useBusinessStore((state) => state.sellerName);
  const sellerPhone = useBusinessStore((state) => state.sellerPhone);
  const sellerCity = useBusinessStore((state) => state.sellerCity);
  const sellerNotes = useBusinessStore((state) => state.sellerNotes);
  const saveSellerProfile = useBusinessStore((state) => state.saveSellerProfile);

  const [activeFilter, setActiveFilter] = useState<StoreFilterType>('all');
  const [prevTargetId, setPrevTargetId] = useState(targetId);
  const [onlyInCatalog, setOnlyInCatalog] = useState(!targetId);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(targetId ?? null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [generatingFullCatalog, setGeneratingFullCatalog] = useState(false);

  if (targetId !== prevTargetId) {
    setPrevTargetId(targetId);
    setFocusedId(targetId ?? null);
    if (targetId) {
      setOnlyInCatalog(false);
    }
  }

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const sellerProfile = useMemo(
    () => ({
      storeName,
      sellerName,
      sellerPhone,
      sellerCity,
      sellerNotes,
    }),
    [storeName, sellerName, sellerPhone, sellerCity, sellerNotes],
  );

  const catalogItems = useMemo(
    () => items.filter((i) => i.inCatalog),
    [items],
  );

  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      if (onlyInCatalog && !item.inCatalog) {
        return false;
      }

      if (activeFilter === 'product' && item.type !== 'product') return false;
      if (activeFilter === 'service' && item.type !== 'service') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesId = item.id.toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesId;
      }

      return true;
    });
  }, [items, onlyInCatalog, activeFilter, searchQuery]);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/negocio');
    }
  }

  /**
   * Genera el PDF del producto y abre el selector de compartir para enviarlo por WhatsApp.
   */
  async function handleSendProductPdf(item: BusinessItem) {
    setGeneratingPdfId(item.id);
    try {
      const pdfUri = await generateProductPdf({
        item,
        seller: sellerProfile,
      });

      await sharePdfFile(
        pdfUri,
        `Ficha técnica de ${item.name} (ID: ${item.id})`,
      );
    } catch (err) {
      Alert.alert(
        'Error al generar PDF',
        err instanceof Error ? err.message : 'No se pudo crear el archivo PDF.',
      );
    } finally {
      setGeneratingPdfId(null);
    }
  }

  /**
   * Genera el PDF del catálogo completo y lo envía por WhatsApp / menú nativo.
   */
  async function handleSendFullCatalogPdf() {
    if (catalogItems.length === 0) {
      Alert.alert(
        'Catálogo sin productos',
        'No tienes productos marcados para el catálogo. Activa algunos antes de exportar el catálogo completo.',
      );
      return;
    }

    setGeneratingFullCatalog(true);
    try {
      const pdfUri = await generateCatalogPdf({
        items: catalogItems,
        seller: sellerProfile,
      });

      await sharePdfFile(
        pdfUri,
        `Catálogo de Productos - ${storeName || 'Mi Tienda'}`,
      );
    } catch (err) {
      Alert.alert(
        'Error al generar Catálogo',
        err instanceof Error ? err.message : 'No se pudo crear el PDF del catálogo.',
      );
    } finally {
      setGeneratingFullCatalog(false);
    }
  }

  /**
   * Comparte el texto / ficha como alternativa.
   */
  async function handleShareProductText(item: BusinessItem) {
    try {
      const appLink = Linking.createURL('/negocio/tienda', {
        queryParams: { id: item.id },
      });

      const message = formatProductShareText({
        item,
        seller: sellerProfile,
        appLink,
      });

      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: item.name,
            text: message,
          });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          Alert.alert(
            'Ficha copiada',
            'La información del producto se copió al portapapeles.',
          );
        }
      } else {
        await Share.share({
          message,
          title: `Producto: ${item.name}`,
        });
      }
    } catch (err) {
      console.warn('Error al compartir texto:', err);
    }
  }

  if (status === 'idle' || status === 'loading') {
    return <LoadingState key={status} title="Cargando tu tienda…" />;
  }

  if (status === 'error') {
    return (
      <LoadingState
        key={status}
        title="Cargando tu tienda…"
        error={error}
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View
          style={[
            styles.blob,
            { backgroundColor: theme.colors.backgroundAccent },
          ]}
        />
        <View
          style={[
            styles.blobSecondary,
            { backgroundColor: theme.colors.backgroundAccentTwo },
          ]}
        />
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              padding: theme.spacing.xl,
              paddingBottom: theme.spacing.xxxl * 2,
              gap: theme.spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Barra superior de navegación */}
          <FadeInView delay={0}>
            <View style={styles.navBar}>
              <BackButton onPress={goBack} />
              <View style={styles.navRightActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Exportar catálogo completo en PDF y compartir"
                  disabled={generatingFullCatalog}
                  onPress={() => void handleSendFullCatalogPdf()}
                  style={({ pressed }) => [
                    styles.shareCatalogButton,
                    {
                      backgroundColor: theme.colors.accent,
                      opacity: generatingFullCatalog ? 0.7 : pressed ? 0.85 : 1,
                      transform: [
                        { scale: pressed && !theme.reduceMotion ? 0.96 : 1 },
                      ],
                    },
                  ]}
                >
                  {generatingFullCatalog ? (
                    <ActivityIndicator size="small" color={theme.colors.onAccent} />
                  ) : (
                    <Text style={styles.shareCatalogButtonIcon}>📑</Text>
                  )}
                  <Text
                    style={[
                      styles.shareCatalogButtonText,
                      { color: theme.colors.onAccent },
                    ]}
                  >
                    {generatingFullCatalog ? 'Generando PDF…' : 'Catálogo PDF'}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ajustes de contacto"
                  onPress={() => setProfileModalVisible(true)}
                  style={({ pressed }) => [
                    styles.profileButton,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      borderColor: theme.colors.separator,
                      opacity: pressed ? 0.85 : 1,
                      transform: [
                        { scale: pressed && !theme.reduceMotion ? 0.96 : 1 },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.profileButtonIcon}>⚙️</Text>
                </Pressable>
              </View>
            </View>
          </FadeInView>

          {/* Tarjeta de información de la tienda */}
          <FadeInView delay={40}>
            <GlassCard contentStyle={styles.sellerCard}>
              <View style={styles.sellerHeaderRow}>
                <View
                  style={[
                    styles.sellerAvatarContainer,
                    { backgroundColor: theme.colors.accentSoft },
                  ]}
                >
                  <Text style={styles.sellerAvatarIcon}>🏪</Text>
                </View>
                <View style={styles.sellerInfoCol}>
                  <Text style={[styles.storeTitle, { color: theme.colors.text }]}>
                    {storeName || 'Mi Tienda Digital'}
                  </Text>
                  <Text style={[styles.sellerSub, { color: theme.colors.textSecondary }]}>
                    {catalogItems.length} {catalogItems.length === 1 ? 'producto activo' : 'productos activos'} en catálogo
                  </Text>

                  <View style={styles.contactChipsRow}>
                    {sellerPhone ? (
                      <View
                        style={[
                          styles.contactChip,
                          { backgroundColor: theme.colors.successSoft },
                        ]}
                      >
                        <Text style={[styles.contactChipText, { color: theme.colors.success }]}>
                          📱 WhatsApp: {sellerPhone}
                        </Text>
                      </View>
                    ) : null}
                    {sellerCity ? (
                      <View style={[styles.contactChip, { backgroundColor: theme.colors.surfaceStrong }]}>
                        <Text style={[styles.contactChipText, { color: theme.colors.textSecondary }]}>
                          📍 {sellerCity}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {sellerNotes ? (
                <View
                  style={[
                    styles.sellerNotesBox,
                    { backgroundColor: theme.colors.surfaceStrong },
                  ]}
                >
                  <Text style={[styles.sellerNotesText, { color: theme.colors.textSecondary }]}>
                    ℹ️ {sellerNotes}
                  </Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajustes de contacto"
                onPress={() => setProfileModalVisible(true)}
                style={[
                  styles.editProfileLink,
                  { borderColor: theme.colors.separator },
                ]}
              >
                <Text style={[styles.editProfileLinkText, { color: theme.colors.accent }]}>
                  {sellerPhone ? '✏️ Ajustes de contacto' : '➕ Configurar ajustes de contacto'}
                </Text>
              </Pressable>
            </GlassCard>
          </FadeInView>

          {/* Banner de producto enfocado */}
          {focusedId ? (
            <FadeInView delay={60}>
              <View
                style={[
                  styles.focusedNotice,
                  {
                    backgroundColor: theme.colors.accentSoft,
                    borderColor: theme.colors.accent,
                  },
                ]}
              >
                <View style={styles.focusedNoticeLeft}>
                  <Text style={[styles.focusedNoticeTitle, { color: theme.colors.accent }]}>
                    🎯 Producto seleccionado
                  </Text>
                  <Text style={[styles.focusedNoticeSub, { color: theme.colors.textSecondary }]}>
                    ID: {focusedId}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver catálogo general"
                  onPress={() => setFocusedId(null)}
                  style={[
                    styles.clearFocusedButton,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Text style={[styles.clearFocusedText, { color: theme.colors.text }]}>
                    Ver todos
                  </Text>
                </Pressable>
              </View>
            </FadeInView>
          ) : null}

          {/* Buscador y opciones de filtro */}
          <FadeInView delay={80}>
            <View style={styles.searchSection}>
              <View
                style={[
                  styles.searchContainer,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.separator,
                  },
                ]}
              >
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Buscar por nombre, detalle o ID (#biz_...)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpiar búsqueda"
                    onPress={() => setSearchQuery('')}
                  >
                    <Text style={[styles.clearSearchIcon, { color: theme.colors.textMuted }]}>
                      ✕
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Selector de modo: Solo catálogo vs Todos */}
              <View style={styles.catalogModeRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Alternar entre ver solo productos del catálogo o todos"
                  onPress={() => setOnlyInCatalog(!onlyInCatalog)}
                  style={[
                    styles.catalogModeToggle,
                    {
                      backgroundColor: onlyInCatalog
                        ? theme.colors.accentSoft
                        : theme.colors.inputBackground,
                      borderColor: onlyInCatalog
                        ? theme.colors.accent
                        : theme.colors.separator,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catalogModeToggleText,
                      {
                        color: onlyInCatalog
                          ? theme.colors.accent
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {onlyInCatalog
                      ? `🛍️ Mostrando solo catálogo (${catalogItems.length})`
                      : `📋 Mostrando todos los ítems (${items.length})`}
                  </Text>
                </Pressable>
              </View>

              {/* Pestañas de categoría */}
              <View
                style={[
                  styles.filterTabs,
                  { backgroundColor: theme.colors.inputBackground },
                ]}
                accessibilityRole="tablist"
              >
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeFilter === 'all' }}
                  onPress={() => setActiveFilter('all')}
                  style={[
                    styles.filterTab,
                    activeFilter === 'all' && {
                      backgroundColor: theme.colors.surfaceStrong,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      {
                        color:
                          activeFilter === 'all'
                            ? theme.colors.text
                            : theme.colors.textSecondary,
                        fontWeight: activeFilter === 'all' ? '700' : '500',
                      },
                    ]}
                  >
                    Todos
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeFilter === 'product' }}
                  onPress={() => setActiveFilter('product')}
                  style={[
                    styles.filterTab,
                    activeFilter === 'product' && {
                      backgroundColor: theme.colors.surfaceStrong,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      {
                        color:
                          activeFilter === 'product'
                            ? theme.colors.text
                            : theme.colors.textSecondary,
                        fontWeight: activeFilter === 'product' ? '700' : '500',
                      },
                    ]}
                  >
                    Productos
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeFilter === 'service' }}
                  onPress={() => setActiveFilter('service')}
                  style={[
                    styles.filterTab,
                    activeFilter === 'service' && {
                      backgroundColor: theme.colors.surfaceStrong,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      {
                        color:
                          activeFilter === 'service'
                            ? theme.colors.text
                            : theme.colors.textSecondary,
                        fontWeight: activeFilter === 'service' ? '700' : '500',
                      },
                    ]}
                  >
                    Servicios
                  </Text>
                </Pressable>
              </View>
            </View>
          </FadeInView>

          {/* Lista de productos del catálogo */}
          <FadeInView delay={100}>
            {displayedItems.length === 0 ? (
              <EmptyState
                title={onlyInCatalog ? 'Catálogo sin productos' : 'No se encontraron elementos'}
                subtitle={
                  onlyInCatalog
                    ? 'No tienes productos activos en el catálogo. Cambia el filtro a "Mostrando todos los ítems" y activa los que quieras vender.'
                    : 'Prueba buscando con otro término.'
                }
                emoji="🛍️"
              />
            ) : (
              <View style={styles.catalogList}>
                {displayedItems.map((item) => {
                  const isFocused = focusedId === item.id;
                  const isProduct = item.type === 'product';
                  const isGeneratingThisPdf = generatingPdfId === item.id;

                  return (
                    <GlassCard
                      key={item.id}
                      contentStyle={[
                        styles.catalogItemCard,
                        isFocused && {
                          borderColor: theme.colors.accent,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      {/* Fila superior: ID y Toggle de Catálogo */}
                      <View style={styles.itemCardTop}>
                        <View
                          style={[
                            styles.idBadge,
                            { backgroundColor: theme.colors.surfaceStrong },
                          ]}
                        >
                          <Text
                            style={[styles.idBadgeText, { color: theme.colors.textSecondary }]}
                            numberOfLines={1}
                          >
                            🏷️ ID: #{item.id}
                          </Text>
                        </View>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            item.inCatalog
                              ? 'En catálogo. Toca para ocultar'
                              : 'Oculto. Toca para agregar al catálogo'
                          }
                          onPress={() =>
                            void toggleCatalogItem(item.id, !item.inCatalog)
                          }
                          style={[
                            styles.toggleCatalogButton,
                            {
                              backgroundColor: item.inCatalog
                                ? theme.colors.successSoft
                                : theme.colors.inputBackground,
                              borderColor: item.inCatalog
                                ? theme.colors.success
                                : theme.colors.separator,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.toggleCatalogText,
                              {
                                color: item.inCatalog
                                  ? theme.colors.success
                                  : theme.colors.textMuted,
                              },
                            ]}
                          >
                            {item.inCatalog ? '🟢 En Catálogo' : '⚪ Oculto'}
                          </Text>
                        </Pressable>
                      </View>

                      {/* Cuerpo del ítem: Imagen, Nombre y Precio */}
                      <View style={styles.itemMainRow}>
                        {item.imageUri ? (
                          <SecureProductImage
                            uri={item.imageUri}
                            label={`Foto de ${item.name}`}
                            style={{
                              ...styles.catalogImage,
                              backgroundColor: theme.colors.inputBackground,
                            }}
                          />
                        ) : null}

                        <View style={styles.itemTextContainer}>
                          <View style={styles.itemNameTypeRow}>
                            <Text
                              style={[styles.catalogItemName, { color: theme.colors.text }]}
                              maxFontSizeMultiplier={1.3}
                            >
                              {item.name}
                            </Text>
                            <View
                              style={[
                                styles.miniTypeBadge,
                                {
                                  backgroundColor: isProduct
                                    ? theme.colors.accentSoft
                                    : theme.colors.successSoft,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.miniTypeBadgeText,
                                  {
                                    color: isProduct
                                      ? theme.colors.accent
                                      : theme.colors.success,
                                  },
                                ]}
                              >
                                {isProduct ? 'Producto' : 'Servicio'}
                              </Text>
                            </View>
                          </View>

                          <Text
                            style={[
                              styles.catalogItemPrice,
                              { color: theme.colors.success },
                            ]}
                            maxFontSizeMultiplier={1.3}
                          >
                            {formatCOP(Math.round(item.pricePerUnit))}
                          </Text>

                          {item.description ? (
                            <Text
                              style={[
                                styles.catalogItemDesc,
                                { color: theme.colors.textSecondary },
                              ]}
                              numberOfLines={3}
                            >
                              {item.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Acciones principales: Enviar PDF o Compartir */}
                      <View style={styles.shareButtonsRow}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Generar PDF de ${item.name} y enviarlo`}
                          disabled={isGeneratingThisPdf}
                          onPress={() => void handleSendProductPdf(item)}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            styles.actionPdfBtn,
                            {
                              backgroundColor: '#25D366',
                              opacity: isGeneratingThisPdf ? 0.7 : pressed ? 0.85 : 1,
                              transform: [
                                { scale: pressed && !theme.reduceMotion ? 0.97 : 1 },
                              ],
                            },
                          ]}
                        >
                          {isGeneratingThisPdf ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.actionBtnIcon}>📄</Text>
                          )}
                          <Text style={styles.actionPdfBtnText}>
                            {isGeneratingThisPdf ? 'Creando PDF…' : 'Enviar PDF'}
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Copiar ficha de texto de ${item.name}`}
                          onPress={() => void handleShareProductText(item)}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            styles.actionTextBtn,
                            {
                              backgroundColor: theme.colors.inputBackground,
                              borderColor: theme.colors.separator,
                              opacity: pressed ? 0.85 : 1,
                              transform: [
                                { scale: pressed && !theme.reduceMotion ? 0.97 : 1 },
                              ],
                            },
                          ]}
                        >
                          <Text style={[styles.actionTextBtnText, { color: theme.colors.text }]}>
                            📋 Copiar texto
                          </Text>
                        </Pressable>
                      </View>
                    </GlassCard>
                  );
                })}
              </View>
            )}
          </FadeInView>
        </ScrollView>
      </SafeAreaView>

      {/* Modal para configurar datos de vendedor y tienda */}
      <SellerProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        initialProfile={sellerProfile}
        onSave={async (profile) => {
          await saveSellerProfile(profile);
          setProfileModalVisible(false);
        }}
      />
    </View>
  );
}

function SellerProfileModal({
  visible,
  onClose,
  initialProfile,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initialProfile: {
    storeName: string;
    sellerName: string;
    sellerPhone: string;
    sellerCity: string;
    sellerNotes: string;
  };
  onSave: (profile: typeof initialProfile) => Promise<void>;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {visible ? (
          <SellerProfileForm
            onClose={onClose}
            initialProfile={initialProfile}
            onSave={onSave}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function SellerProfileForm({
  onClose,
  initialProfile,
  onSave,
}: {
  onClose: () => void;
  initialProfile: {
    storeName: string;
    sellerName: string;
    sellerPhone: string;
    sellerCity: string;
    sellerNotes: string;
  };
  onSave: (profile: typeof initialProfile) => Promise<void>;
}) {
  const theme = useTheme();
  const [storeName, setStoreName] = useState(initialProfile.storeName);
  const [sellerName, setSellerName] = useState(initialProfile.sellerName);
  const [sellerPhone, setSellerPhone] = useState(initialProfile.sellerPhone);
  const [sellerCity, setSellerCity] = useState(initialProfile.sellerCity);
  const [sellerNotes, setSellerNotes] = useState(initialProfile.sellerNotes);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        storeName: storeName.trim(),
        sellerName: sellerName.trim(),
        sellerPhone: sellerPhone.trim(),
        sellerCity: sellerCity.trim(),
        sellerNotes: sellerNotes.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View
      style={[
        styles.modalContent,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
          Ajustes de contacto
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar modal"
          onPress={onClose}
          style={styles.modalCloseBtn}
        >
          <Text style={[styles.modalCloseText, { color: theme.colors.textMuted }]}>
            ✕
          </Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalForm}>
        <Text style={[styles.modalIntro, { color: theme.colors.textSecondary }]}>
          Configura los datos de tu negocio y canales de contacto para tus clientes.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
            Nombre de la Tienda
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.separator,
              },
            ]}
            placeholder="Ej. Tienda Los Andes"
            placeholderTextColor={theme.colors.textMuted}
            value={storeName}
            onChangeText={setStoreName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
            Tu nombre (Vendedor)
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.separator,
              },
            ]}
            placeholder="Ej. Carlos Mendoza"
            placeholderTextColor={theme.colors.textMuted}
            value={sellerName}
            onChangeText={setSellerName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
            Tu WhatsApp de contacto
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.separator,
              },
            ]}
            placeholder="Ej. 3001234567"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="phone-pad"
            value={sellerPhone}
            onChangeText={setSellerPhone}
          />
          <Text style={[styles.inputHint, { color: theme.colors.textMuted }]}>
            Número principal para que tus clientes te contacten y realicen pedidos.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
            Ciudad / Ubicación
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.separator,
              },
            ]}
            placeholder="Ej. Medellín, Colombia"
            placeholderTextColor={theme.colors.textMuted}
            value={sellerCity}
            onChangeText={setSellerCity}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
            Notas, envíos y medios de pago
          </Text>
          <TextInput
            style={[
              styles.formInput,
              styles.formMultiline,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.separator,
              },
            ]}
            placeholder="Ej. Envíos nacionales • Pagos Nequi / Bancolombia / Contraentrega"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={3}
            value={sellerNotes}
            onChangeText={setSellerNotes}
          />
        </View>

        <View style={styles.modalActions}>
          <PrimaryButton
            label={saving ? 'Guardando…' : 'Guardar ajustes'}
            loading={saving}
            disabled={saving}
            onPress={() => void handleSave()}
          />
          <PrimaryButton
            label="Cancelar"
            variant="ghost"
            disabled={saving}
            onPress={onClose}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  blob: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -150,
    right: -120,
    opacity: 0.9,
  },
  blobSecondary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: -100,
    left: -130,
    opacity: 0.8,
  },
  scrollContent: { width: '100%' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareCatalogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  shareCatalogButtonIcon: {
    fontSize: 15,
  },
  shareCatalogButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileButtonIcon: {
    fontSize: 18,
  },
  sellerCard: {
    gap: 12,
  },
  sellerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  sellerAvatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarIcon: {
    fontSize: 26,
  },
  sellerInfoCol: {
    flex: 1,
    gap: 3,
  },
  storeTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sellerSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  contactChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  contactChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  contactChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sellerNotesBox: {
    padding: 10,
    borderRadius: 10,
  },
  sellerNotesText: {
    fontSize: 12,
    lineHeight: 16,
  },
  editProfileLink: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  editProfileLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  focusedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  focusedNoticeLeft: {
    flex: 1,
    gap: 2,
  },
  focusedNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  focusedNoticeSub: {
    fontSize: 12,
  },
  clearFocusedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearFocusedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchSection: {
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  clearSearchIcon: {
    fontSize: 16,
    padding: 4,
  },
  catalogModeRow: {
    flexDirection: 'row',
  },
  catalogModeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  catalogModeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabText: {
    fontSize: 12,
    lineHeight: 16,
  },
  catalogList: {
    gap: 16,
  },
  catalogItemCard: {
    gap: 14,
  },
  itemCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '65%',
  },
  idBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  toggleCatalogButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleCatalogText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemMainRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  catalogImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  itemTextContainer: {
    flex: 1,
    gap: 4,
  },
  itemNameTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  catalogItemName: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  miniTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  catalogItemPrice: {
    fontSize: 20,
    fontWeight: '800',
  },
  catalogItemDesc: {
    fontSize: 13,
    lineHeight: 17,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnIcon: {
    fontSize: 15,
  },
  actionPdfBtn: {
    flex: 1.2,
  },
  actionPdfBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  actionTextBtn: {
    borderWidth: 1,
  },
  actionTextBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalForm: {
    gap: 16,
    paddingBottom: 24,
  },
  modalIntro: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  formInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  formMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  modalActions: {
    gap: 8,
    marginTop: 8,
  },
});
