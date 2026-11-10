import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { BusinessCalculation, BusinessItem } from '../../src/domain/business';
import { formatCOP } from '../../src/domain/money';
import { useBusinessStore } from '../../src/store/useBusinessStore';
import { useTheme } from '../../src/theme';
import { AnimatedNumber } from '../../src/ui/AnimatedNumber';
import { BackButton } from '../../src/ui/BackButton';
import { EmptyState } from '../../src/ui/EmptyState';
import { FadeInView } from '../../src/ui/FadeInView';
import { FloatingActionButton } from '../../src/ui/FloatingActionButton';
import { GlassCard } from '../../src/ui/GlassCard';
import { PrimaryButton } from '../../src/ui/PrimaryButton';

type FilterType = 'all' | 'product' | 'service';

export default function NegocioIndexScreen() {
  const theme = useTheme();
  const items = useBusinessStore((state) => state.items);
  const calculations = useBusinessStore((state) => state.calculations);
  const totals = useBusinessStore((state) => state.totals);
  const status = useBusinessStore((state) => state.status);
  const error = useBusinessStore((state) => state.error);
  const initialize = useBusinessStore((state) => state.initialize);
  const refresh = useBusinessStore((state) => state.refresh);
  const deleteItem = useBusinessStore((state) => state.deleteItem);

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const productItems = items.filter((i) => i.type === 'product');
  const serviceItems = items.filter((i) => i.type === 'service');

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'product') return item.type === 'product';
    if (activeFilter === 'service') return item.type === 'service';
    return true;
  });

  const totalDailyGoal = items.reduce((acc, i) => acc + (i.dailyGoal || 0), 0);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/hoy');
    }
  }

  function confirmDeleteItem(item: BusinessItem) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`¿Deseas eliminar "${item.name}"?`)) {
        void deleteItem(item.id);
      }
    } else {
      Alert.alert(
        'Eliminar producto o servicio',
        `¿Deseas eliminar "${item.name}"? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              void deleteItem(item.id);
            },
          },
        ],
      );
    }
  }

  if (status !== 'ready') {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.centered}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Mi negocio</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Cargando tu información…
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.centered}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Mi negocio</Text>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{error}</Text>
            <PrimaryButton label="Intentar de nuevo" onPress={refresh} style={styles.retry} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              padding: theme.spacing.xl,
              paddingBottom: theme.spacing.xxxl * 2,
              gap: theme.spacing.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Barra de navegación superior con botón Atrás */}
          <FadeInView delay={0}>
            <View style={styles.navBar}>
              <BackButton onPress={goBack} />
              <PrimaryButton
                label="+ Nuevo"
                variant="ghost"
                onPress={() => router.push('/negocio/nuevo' as any)}
                style={styles.addButtonNav}
              />
            </View>
          </FadeInView>

          {/* Encabezado de la pantalla */}
          <FadeInView delay={40}>
            <View style={styles.header}>
              <Text
                style={[styles.overline, { color: theme.colors.accent }]}
                maxFontSizeMultiplier={1.3}
              >
                EMPRENDIMIENTO Y VENTAS
              </Text>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: theme.colors.text }]}
              >
                Mi negocio
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Controla tus costos, ganancias diarias y metas
              </Text>
            </View>
          </FadeInView>

          {/* Tarjeta Hero: Ganancia total y resumen financiero */}
          <FadeInView delay={90}>
            <GlassCard contentStyle={styles.heroCardContent}>
              <View style={styles.heroHeader}>
                <Text style={[styles.heroOverline, { color: theme.colors.textMuted }]}>
                  GANANCIA LIBRE ESTIMADA
                </Text>
                <AnimatedNumber
                  value={totals.profit}
                  format={(val) => formatCOP(Math.round(val))}
                  accessibilityLabel={`Ganancia libre total: ${formatCOP(totals.profit)}`}
                  style={[
                    styles.heroProfitNumber,
                    {
                      color:
                        totals.profit >= 0
                          ? theme.colors.success
                          : theme.colors.danger,
                    },
                  ]}
                />
                <Text style={[styles.heroHint, { color: theme.colors.textSecondary }]}>
                  {items.length === 0
                    ? 'Aún no has registrado ítems'
                    : `Resultado con ${items.length} producto${items.length !== 1 ? 's' : ''}/servicio${items.length !== 1 ? 's' : ''}`}
                </Text>
              </View>

              {/* Fila con desglose limpio: Ingreso, Costo y Reinversión */}
              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statBox,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      borderColor: theme.colors.separator,
                    },
                  ]}
                >
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    Ingreso total
                  </Text>
                  <Text
                    style={[styles.statValue, { color: theme.colors.text }]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {formatCOP(Math.round(totals.revenue))}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statBox,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      borderColor: theme.colors.separator,
                    },
                  ]}
                >
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    Costo / Inversión
                  </Text>
                  <Text
                    style={[styles.statValue, { color: theme.colors.textSecondary }]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {formatCOP(Math.round(totals.cost))}
                  </Text>
                </View>
              </View>

              {/* Meta Diaria si existe */}
              {totalDailyGoal > 0 ? (
                <View
                  style={[
                    styles.goalBox,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      borderColor: theme.colors.separator,
                    },
                  ]}
                >
                  <View style={styles.goalHeader}>
                    <Text style={[styles.goalTitle, { color: theme.colors.text }]}>
                      Meta diaria combinada
                    </Text>
                    <Text
                      style={[
                        styles.goalStatusPill,
                        {
                          color: totals.goalReached
                            ? theme.colors.success
                            : theme.colors.warning,
                        },
                      ]}
                    >
                      {totals.goalReached
                        ? '🎉 ¡Meta cumplida!'
                        : `Faltan ${formatCOP(Math.round(totals.remainingToGoal))}`}
                    </Text>
                  </View>

                  <View style={styles.goalProgressTrack}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        {
                          width: `${Math.min(100, Math.round(totals.goalPct))}%`,
                          backgroundColor: totals.goalReached
                            ? theme.colors.success
                            : theme.colors.accent,
                        },
                      ]}
                    />
                  </View>

                  <Text style={[styles.goalSub, { color: theme.colors.textMuted }]}>
                    {formatCOP(Math.round(totals.profit))} de {formatCOP(Math.round(totalDailyGoal))} ({Math.round(totals.goalPct)}%)
                  </Text>
                </View>
              ) : null}
            </GlassCard>
          </FadeInView>

          {/* Pestañas de filtrado (Todos / Productos / Servicios) */}
          <FadeInView delay={140}>
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
                  Todos ({items.length})
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
                  📦 Productos ({productItems.length})
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
                  🚗 Servicios ({serviceItems.length})
                </Text>
              </Pressable>
            </View>
          </FadeInView>

          {/* Lista de productos y servicios (sin FlatList anidado) */}
          <FadeInView delay={180}>
            <View style={styles.listSection}>
              {filteredItems.length === 0 ? (
                items.length === 0 ? (
                  <EmptyState
                    title="Sin productos o servicios"
                    subtitle="Registra lo que vendes u ofreces para calcular tus ganancias, costos y metas diarias de forma clara."
                    emoji="💼"
                  />
                ) : (
                  <EmptyState
                    title="Sin elementos aquí"
                    subtitle="No tienes ítems en esta categoría."
                    emoji="🔍"
                  />
                )
              ) : (
                <View style={styles.itemsContainer}>
                  {filteredItems.map((item) => {
                    const originalIndex = items.findIndex((i) => i.id === item.id);
                    const calc = calculations[originalIndex];

                    return (
                      <BusinessItemCard
                        key={item.id}
                        item={item}
                        calculation={calc}
                        onEdit={() => {
                          router.push({
                            pathname: '/negocio/editar/[id]',
                            params: { id: item.id },
                          });
                        }}
                        onDelete={() => confirmDeleteItem(item)}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </FadeInView>
        </ScrollView>
      </SafeAreaView>

      {/* Botón flotante para agregar producto o servicio */}
      <FloatingActionButton
        accessibilityLabel="Agregar nuevo producto o servicio"
        onPress={() => router.push('/negocio/nuevo' as any)}
      />
    </View>
  );
}

/**
 * Tarjeta espaciosa, legible y accesible para cada ítem del negocio.
 */
function BusinessItemCard({
  item,
  calculation,
  onEdit,
  onDelete,
}: {
  item: BusinessItem;
  calculation?: BusinessCalculation;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const isProduct = item.type === 'product';

  const profit = calculation?.profit ?? 0;
  const revenue = calculation?.revenue ?? item.pricePerUnit * item.quantity;
  const cost = calculation?.cost ?? (isProduct ? item.investment : 0);

  return (
    <GlassCard contentStyle={styles.cardContent}>
      {/* Cabecera de la tarjeta: Categoría y Ganancia destacada */}
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor: isProduct
                ? theme.colors.accentSoft
                : theme.colors.successSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.typeBadgeText,
              {
                color: isProduct ? theme.colors.accent : theme.colors.success,
              },
            ]}
          >
            {isProduct ? '📦 Producto' : '🚗 Servicio'}
          </Text>
        </View>

        <View style={styles.profitBadge}>
          <Text style={[styles.profitLabel, { color: theme.colors.textMuted }]}>
            Ganancia
          </Text>
          <Text
            style={[
              styles.profitNumber,
              {
                color:
                  profit >= 0 ? theme.colors.success : theme.colors.danger,
              },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {profit >= 0 ? '+' : ''}
            {formatCOP(Math.round(profit))}
          </Text>
        </View>
      </View>

      {/* Nombre principal */}
      <Text
        style={[styles.itemName, { color: theme.colors.text }]}
        maxFontSizeMultiplier={1.3}
      >
        {item.name}
      </Text>

      {/* Grid de indicadores claros y espaciosos */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailItemLabel, { color: theme.colors.textSecondary }]}>
            Precio venta
          </Text>
          <Text
            style={[styles.detailItemValue, { color: theme.colors.text }]}
            maxFontSizeMultiplier={1.3}
          >
            {formatCOP(Math.round(item.pricePerUnit))}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={[styles.detailItemLabel, { color: theme.colors.textSecondary }]}>
            Cantidad diaria
          </Text>
          <Text
            style={[styles.detailItemValue, { color: theme.colors.text }]}
            maxFontSizeMultiplier={1.3}
          >
            {item.quantity} {isProduct ? 'unidades' : 'servicios'}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={[styles.detailItemLabel, { color: theme.colors.textSecondary }]}>
            Ingreso diario
          </Text>
          <Text
            style={[styles.detailItemValue, { color: theme.colors.text }]}
            maxFontSizeMultiplier={1.3}
          >
            {formatCOP(Math.round(revenue))}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={[styles.detailItemLabel, { color: theme.colors.textSecondary }]}>
            {isProduct ? 'Costo inversión' : 'Costo operativo'}
          </Text>
          <Text
            style={[styles.detailItemValue, { color: theme.colors.textSecondary }]}
            maxFontSizeMultiplier={1.3}
          >
            {isProduct ? formatCOP(Math.round(cost)) : 'Sin costo'}
          </Text>
        </View>
      </View>

      {/* Meta diaria si aplica */}
      {item.dailyGoal > 0 ? (
        <View
          style={[
            styles.itemGoalBox,
            {
              backgroundColor: theme.colors.inputBackground,
              borderColor: theme.colors.separator,
            },
          ]}
        >
          <Text style={[styles.itemGoalText, { color: theme.colors.textSecondary }]}>
            Meta diaria: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{formatCOP(Math.round(item.dailyGoal))}</Text>
          </Text>
          {calculation?.goalReached ? (
            <Text style={[styles.itemGoalAchieved, { color: theme.colors.success }]}>
              ✓ Cumplida
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Acciones de la tarjeta */}
      <View style={styles.cardActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar ${item.name}`}
          onPress={onEdit}
          style={[
            styles.actionButton,
            {
              borderColor: theme.colors.separator,
              backgroundColor: theme.colors.inputBackground,
            },
          ]}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
            ✏️ Editar
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${item.name}`}
          onPress={onDelete}
          style={[
            styles.actionButton,
            {
              borderColor: theme.colors.separator,
              backgroundColor: theme.colors.inputBackground,
            },
          ]}
        >
          <Text
            style={[styles.actionButtonText, { color: theme.colors.danger }]}
          >
            🗑️ Eliminar
          </Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: {
    width: '100%',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  retry: {
    minWidth: 180,
    marginTop: 8,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  addButtonNav: {
    minWidth: 90,
  },
  header: {
    gap: 4,
  },
  overline: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroCardContent: {
    gap: 16,
  },
  heroHeader: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  heroOverline: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroProfitNumber: {
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroHint: {
    fontSize: 14,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  goalBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  goalStatusPill: {
    fontSize: 12,
    fontWeight: '700',
  },
  goalProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(128, 128, 128, 0.18)',
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalSub: {
    fontSize: 11,
    fontWeight: '500',
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
  listSection: {
    width: '100%',
  },
  itemsContainer: {
    gap: 14,
  },
  cardContent: {
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  profitBadge: {
    alignItems: 'flex-end',
  },
  profitLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  profitNumber: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  itemName: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  detailItem: {
    width: '47%',
    gap: 2,
  },
  detailItemLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailItemValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  itemGoalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemGoalText: {
    fontSize: 12,
  },
  itemGoalAchieved: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
