import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  normalizeBusinessGoal,
  type BusinessItem,
} from '../../src/domain/business';
import { formatCOP } from '../../src/domain/money';
import { useBusinessStore } from '../../src/store/useBusinessStore';
import { useTheme } from '../../src/theme';
import { AnimatedNumber } from '../../src/ui/AnimatedNumber';
import { BackButton } from '../../src/ui/BackButton';
import { EmptyState } from '../../src/ui/EmptyState';
import { FadeInView } from '../../src/ui/FadeInView';
import { FloatingActionButton } from '../../src/ui/FloatingActionButton';
import { GlassCard } from '../../src/ui/GlassCard';
import { HapticPressable as Pressable } from '../../src/ui/HapticPressable';
import { LoadingState } from '../../src/ui/LoadingState';
import { BusinessItemCard } from '../../src/ui/business/BusinessItemCard';

type FilterType = 'all' | 'product' | 'service';

export default function NegocioIndexScreen() {
  const theme = useTheme();
  const items = useBusinessStore((state) => state.items);
  const calculations = useBusinessStore((state) => state.calculations);
  const totals = useBusinessStore((state) => state.totals);
  const goalAmount = useBusinessStore((state) => state.goalAmount);
  const goalPeriod = useBusinessStore((state) => state.goalPeriod);
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
  const calculationById = useMemo(
    () => new Map(items.map((item, index) => [item.id, calculations[index]])),
    [calculations, items],
  );

  const totalDailyGoal = normalizeBusinessGoal(goalAmount, goalPeriod);

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

  if (status === 'idle' || status === 'loading') {
    return <LoadingState key={status} title="Cargando tu negocio…" />;
  }

  if (status === 'error') {
    return (
      <LoadingState
        key={status}
        title="Cargando tu negocio…"
        error={error}
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
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
          {/* Barra de navegación superior con botón Atrás */}
          <FadeInView delay={0}>
            <View style={styles.navBar}>
              <BackButton onPress={goBack} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajustes de Mi negocio"
                onPress={() => router.push('/negocio/ajustes' as never)}
                style={[
                  styles.settingsButton,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.separator,
                  },
                ]}
              >
                <Text style={[styles.settingsIcon, { color: theme.colors.text }]}>
                  ⚙
                </Text>
              </Pressable>
            </View>
          </FadeInView>

          <FadeInView delay={40}>
            <View style={styles.header}>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: theme.colors.text }]}
              >
                Mi negocio
              </Text>
            </View>
          </FadeInView>

          <FadeInView delay={90}>
            <GlassCard
              contentStyle={styles.heroCardContent}
              intensity={48}
            >
              <View
                style={[
                  styles.heroAccent,
                  {
                    backgroundColor:
                      totals.profit >= 0
                        ? theme.colors.success
                        : theme.colors.danger,
                  },
                ]}
              />
              <View style={styles.heroHeader}>
                <Text style={[styles.heroOverline, { color: theme.colors.textSecondary }]}>
                  {totals.profit < 0 ? 'Pérdida estimada' : 'Ganancia estimada'}
                </Text>
                <AnimatedNumber
                  value={Math.abs(totals.profit)}
                  format={(val) => formatCOP(Math.round(val))}
                  accessibilityLabel={`${
                    totals.profit < 0 ? 'Pérdida neta' : 'Ganancia libre total'
                  }: ${formatCOP(Math.abs(totals.profit))}`}
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
                    ? 'Agrega tu primer producto o servicio'
                    : `${items.length} ${items.length === 1 ? 'ítem' : 'ítems'}`}
                </Text>
              </View>

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
                    Ventas
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
                    Costos
                  </Text>
                  <Text
                    style={[styles.statValue, { color: theme.colors.textSecondary }]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {formatCOP(Math.round(totals.cost))}
                  </Text>
                </View>
              </View>

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
                      Meta diaria
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

                  <View
                    style={[
                      styles.goalProgressTrack,
                      { backgroundColor: theme.colors.separator },
                    ]}
                  >
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
                accessibilityLabel={`Todos, ${items.length} elementos`}
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
                accessibilityLabel={`Productos, ${productItems.length}`}
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
                accessibilityLabel={`Servicios, ${serviceItems.length}`}
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
          </FadeInView>

          <FadeInView delay={180}>
            <View style={styles.listSection}>
              {filteredItems.length === 0 ? (
                items.length === 0 ? (
                  <EmptyState
                    title="Sin productos o servicios"
                    subtitle="Toca + para agregar tu primer producto o servicio."
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
                    return (
                      <BusinessItemCard
                        key={item.id}
                        item={item}
                        calculation={calculationById.get(item.id)}
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
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  header: {
    gap: 2,
  },
  heroCardContent: {
    gap: 16,
  },
  heroAccent: {
    width: 42,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 2,
  },
  heroHeader: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  heroOverline: {
    fontSize: 14,
    fontWeight: '800',
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
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
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
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
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

});
