# ¿Me alcanza?

App de finanzas personales de una sola función: saber **cuánto puedes gastar hoy** sin arruinar el mes. Construida para Colombia, en pesos colombianos (COP), con todo local: sin cuentas, sin servidor y sin internet.

## Estado del proyecto

- **Fase 1 completada:** proyecto Expo SDK 58 con TypeScript estricto, estructura base, dominio puro (`budget.ts`, `money.ts`) y pruebas unitarias.
- **Fase 2 completada:** base local con SQLite y migraciones versionadas, repositorios de configuración mensual y gastos, borrado lógico y estado global con Zustand.
- **Fase 3 completada:** tema claro/oscuro, componentes de vidrio, tipografía del sistema, movimiento reducido y flujo de bienvenida, ingreso, fijos y revelación.
- **Fase 4 completada:** hoja de registro de gastos, lista de gastos del día, botón flotante +, borrado lógico con deshacer y hápticos.
- **Fase 5 completada:** pantalla de Ajustes, preferencias de tema (sistema/claro/oscuro), toggle de reducir movimiento, borrado de datos con confirmación y acceso desde Hoy.
- **Fase 6 completada:** notificaciones locales diarias, solicitud de permiso, preferencias de notificación en Ajustes y manejo de toque de notificación.
- **Fase 7 completada:** persistencia de preferencias con expo-secure-store, 78 pruebas en 9 suites, cobertura 100 % del dominio, typecheck/lint/expo-doctor/export Android correctos. Proyecto listo para uso en el teléfono.
- **Margen de gasto razonable (nuevo):** barra horizontal del 1 al 100 % dividida en secciones (Conservador, Normal, Límite), sistema de verificación fuerte de gastos en dominio puro y advertencia/bloqueo interactivo al registrar gastos.
- **Registro de ingresos adicionales (nuevo):** registro de dineros que ingresan durante el mes (trabajos extra, ventas, bonos) que se suman al presupuesto del mes y recalculan automáticamente el disponible diario y del mes.
- **UX/UI simplificada y accesible (nuevo):** botones de acceso rápido directos, hoja unificada para gastos e ingresos, tipografía más grande, contrastes optimizados y soporte para personas mayores.
- **Módulo de negocio (nuevo):** pantallas para registrar productos o servicios, calcular ganancias y metas diarias.

## Requisitos

- Node.js **22.13 o superior** (probado con Node 26.13).
- npm 11 o superior.
- Para probar en el teléfono: la app **Expo Go** (Android/iOS) o un desarrollo con EAS.

## Arranque

```bash
npm install
npm start
```

Escanea el código QR con Expo Go o usa `npm run android` / `npm run ios`.

> Algunas funciones de las fases siguientes (notificaciones, SQLite) pueden requerir un *development build* en lugar de Expo Go. Se indicará en su momento.

## Calidad

```bash
npm test            # pruebas de dominio, datos y store
npm run test:coverage
npm run typecheck   # TypeScript estricto
npm run lint        # ESLint
```

## Estructura

```text
app/                  Rutas de Expo Router
  _layout.tsx         Tema, estado inicial y pila de navegación
  index.tsx           Decide entre onboarding y Hoy
  hoy.tsx             Resumen del número diario, micro-margen, lista de gastos y botón +
  balance.tsx         Balance completo, análisis del margen y simulador de impacto interactivo
  settings.tsx        Ajustes: tema, reducir movimiento, notificaciones, borrar datos
  negocio/
    _layout.tsx         Layout de la sección de negocio
    index.tsx           Lista de productos/servicios con totales de ganancia
    nuevo.tsx           Formulario para agregar producto o servicio
    editar/
      [id].tsx          Editar o eliminar un producto existente
  onboarding/
    welcome.tsx       Bienvenida y opción de copiar el mes anterior
    income.tsx        Ingreso mensual
    fixed.tsx         Gastos fijos
    reveal.tsx        Revelación del número diario
src/
  domain/             Cálculo puro, sin interfaz ni base de datos
    budget.ts         calcToday, tipos, categorías y utilidades de fecha
    money.ts          Formato COP y campos numéricos
    labels.ts         Meses, fechas y plurales en español
    notifications.ts  Utilidades puras de notificaciones (hora, cuenta atrás)
  data/               SQLite, migraciones y repositorios
    migrations.ts     Esquema versionado con PRAGMA user_version
    db.ts             Apertura única de la base y aplicación de migraciones
    configRepo.ts     Lectura y escritura de month_config
    expenseRepo.ts    Gastos, consultas por rango y borrado lógico
    incomeRepo.ts     Ingresos adicionales, consultas por rango y borrado lógico
  store/              Zustand
    useBudgetStore.ts Estado del mes, gastos, ingresos y acciones
    useOnboardingStore.ts  Datos temporales del onboarding
  ui/                 Componentes visuales
    Screen.tsx        Fondo, área segura y scroll
    GlassCard.tsx     Tarjeta translúcida
    MoneyInput.tsx    Campo de pesos con puntos de miles
    AnimatedNumber.tsx  Número animado de ~1.1 s
    PrimaryButton.tsx Botones y hápticos
    FadeInView.tsx    Entradas escalonadas
    ExpenseSheet.tsx  Hoja unificada de registro de gastos e ingresos
    ExpenseItem.tsx   Fila de gasto en lista
    IncomeItem.tsx    Fila de ingreso en lista
    FloatingActionButton.tsx Botón + flotante
    CategoryChip.tsx  Ficha de categoría
    SettingsRow.tsx   Fila de ajuste
    useNotifications.ts Hook de notificaciones locales
  theme/              Paletas, tipografía, espacios y movimiento reducido
__tests__/            Pruebas de Jest
```

## Decisiones de la Fase 1

- **Zona horaria:** el día se deriva con la hora local del teléfono. Las pruebas construyen fechas locales para ser deterministas.
- **Redondeo:** el dominio devuelve valores decimales cuando el número diario no es entero; la presentación usa enteros COP.
- **Porcentaje usado:** si `income − fixed` es menor o igual a cero, `usedPct` vale `0` y el estado es rojo.
- **Gastos futuros:** un gasto con fecha posterior a hoy dentro del mismo mes no se descuenta hasta que llegue su día.
- **Borrado lógico:** los gastos con `deletedAt` distinto de `null` se ignoran en todos los cálculos.
- **Sin analíticas:** no se instala ningún SDK de terceros que recolecte datos.

## Datos locales (Fase 2)

La base `mealcanza.db` se abre una sola vez por proceso y se migra con `PRAGMA user_version`. Cada migración corre dentro de una transacción, así que un fallo no deja el esquema a medias.

```sql
month_config(month TEXT PK 'YYYY-MM', income INTEGER, fixed INTEGER)
expense(id TEXT PK, amount INTEGER > 0, category TEXT, ts INTEGER, deleted_at INTEGER NULL)
-- índice: idx_expense_ts sobre expense(ts)
```

- **Borrado lógico:** borrar un gasto solo llena `deleted_at`; así se puede deshacer y el cálculo ignora los gastos borrados.
- **Consultas por rango:** los gastos se leen por `ts` con límites `[inicio, fin)`; el día y el mes se derivan de la hora local.
- **Pruebas de datos:** usan `node:sqlite` (`DatabaseSync`) mediante un adaptador asíncrono, de modo que se prueba el SQL real sin el módulo nativo de Expo.
- **Mes nuevo:** si no hay `month_config` para el mes actual, el store marca `needsMonthSetup` y ofrece copiar la configuración del mes anterior más reciente.
- **Cambio de mes:** al agregar un gasto, si el mes cambió desde la última carga, el store refresca antes de validar y guardar.

## Interfaz (Fase 3)

- **Tema:** sigue el modo claro/oscuro del sistema. La paleta vive en `src/theme/tokens.ts` y se consume con `useTheme()`.
- **Vidrio líquido:** `GlassCard` usa `expo-blur` en iOS y una superficie translúcida equivalente en Android para no pagar el costo del desenfoque experimental.
- **Movimiento reducido:** `ThemeProvider` escucha `AccessibilityInfo`. Con la preferencia activa, las entradas y el número aparecen de inmediato y se omiten los hápticos.
- **Tipografía:** se usa la fuente del sistema con tamaños que respetan el tamaño dinámico; los números grandes tienen un límite para no desbordar.
- **Entrada de dinero:** el campo agrega puntos de miles mientras se escribe y entrega enteros. El `$` y `COP` son presentación, no parte del valor.
- **Onboarding:** bienvenida → ingreso → fijos → revelación. Al terminar, el mes queda guardado en SQLite y la app pasa a Hoy.
- **Mes anterior:** si existe una configuración previa, la bienvenida ofrece copiarla con un toque.
- **Web:** se usa `output: "single"` para evitar el desajuste de hidratación que producía el SSR con el tema del sistema. La app está pensada para el teléfono.

## Registro de gastos (Fase 4)

- **Botón flotante +:** siempre visible en Hoy, abre la hoja de registro sin salir de la pantalla.
- **Hoja de registro:** monto con puntos de miles, selector de categoría (comida, transporte, ocio, otros) y botón Guardar.
- **Lista del día:** muestra cada gasto con categoría, monto negativo y hora. Cada fila tiene un botón de borrar.
- **Borrado con deshacer:** borrar un gasto activa el borrado lógico y muestra una barra "Deshacer" durante 5 segundos.
- **Hápticos:** vibración al guardar y al completar el onboarding; se desactiva con reducir movimiento.
- **Número animado:** el número diario sube desde cero en ~1.1 s en la pantalla Hoy y la revelación.

## Margen de gasto razonable

Sistema proporcional que indica cuánto de lo disponible puede gastar la persona de forma razonable hoy o en el mes: `(ingreso − fijos − gastos ya hechos) ÷ días restantes`.

- **Micro-barra compacta en Hoy:** indicador limpio y no invasivo dentro de la tarjeta de "Puedes gastar hoy" que muestra el porcentaje de avance, el estado y un acceso directo `Balance ›` sin saturar la pantalla con información redundante.
- **Pantalla dedicada de Balance y Margen (`app/balance.tsx`):**
  - Barra completa de 1 a 100 % con tres secciones cromáticas (Conservador 0-70 %, Normal 70-90 %, Límite >90 %).
  - Selector interactivo entre análisis de **Hoy (diario)** y **Mes completo**.
  - **Simulador de impacto con animaciones en tiempo real:** permite tocar botones rápidos (+10k, +30k, +50k, +100k) para previsualizar al instante cómo se movería la barra de margen y en cuánto se reduciría la cuota diaria de mañana.
  - Desglose mensual completo (ingresos, fijos, gastos acumulados, disponible y proyecciones).
- **Sistema de verificación fuerte (`src/domain/spendingMargin.ts`):**
  - Validación de monto entero positivo y fecha dentro del mes en curso.
  - Bloqueo estricto si el gasto supera todo el disponible del mes (`income - fixed - spentMonth`).
  - Advertencia con confirmación requerida si el gasto supera la cuota razonable del día (`daily`), calculando y mostrando el impacto en la cuota de mañana.
  - Mensajes claros y detallados explicando *por qué* se permite, se advierte o se bloquea el gasto.
- **Pendientes / por organizar:**
  - Porcentajes exactos de corte de cada sección y umbrales de alerta (actualmente configurados en 70 % y 90 %).
  - Modo preferido del margen (diario vs. mensual; configurable en el store y con selector en UI).
  - Persistencia del modo y umbrales en SQLite (actualmente en memoria con Zustand).

## Ajustes (Fase 5)

- **Tema:** elige entre Sistema (sigue el modo del teléfono), Claro y Oscuro.
- **Reducir movimiento:** desactiva animaciones y hápticos; se respeta también la preferencia del sistema.
- **Borrar todos los datos:** confirma con una alerta antes de eliminar ingreso, gastos fijos y gastos registrados. No se puede deshacer.
- **Notificaciones:** activa un recordatorio diario (20:00 por defecto) para revisar tu número diario. Se solicita permiso al activar y se puede desactivar en cualquier momento.
- **Versión y privacidad:** información de la app y recordatorio de que todo vive en el teléfono.

## Notificaciones (Fase 6)

- **Recordatorio diario:** notificación local a la hora configurada (20:00 por defecto) que invita a revisar el número diario del mes.
- **Permiso:** se solicita al activar las notificaciones desde Ajustes. Si se deniega, el toggle se desactiva y se muestra "Permiso denegado".
- **Toque en la notificación:** al tocarla, la app abre la pantalla Hoy.
- **Sin servidor:** las notificaciones son locales, programadas en el dispositivo, y funcionan en modo avión.

## Módulo de negocio / emprendimiento

Además del presupuesto personal, la app incluye un módulo para registrar productos o servicios de tu propio negocio y calcular cuánto ganas y cuánto queda para reinvertir. Sirve para cualquier actividad: canasta de huevos, viajes de Indrive/Uber, ventas de ropa, cortes de cabello, etc.

### Cómo funciona

1. **Agregar un producto o servicio:** desde Hoy o Ajustes, toca "Mi negocio" → "+ Nuevo". Ingresa el nombre, precio de venta, costo por unidad, cantidad que vendes/realizas al día y tu meta de ganancia diaria.
2. **Ver ganancias:** la pantalla principal muestra ingreso total, costo total, ganancia libre, cuánto falta para la meta y cuánto queda para reinvertir.
3. **Cada producto tiene su fila:** muestra el margen de ganancia individual (en verde si es positivo, en rojo si es negativo).
4. **Editar o eliminar:** toca cualquier producto para modificar sus datos, o elimínalo si ya no lo usas.
5. **Todo local:** los datos de tu negocio viven en SQLite en tu teléfono, igual que el presupuesto personal.

### Cálculos

- **Ingreso:** precio de venta × cantidad
- **Costo:** costo por unidad × cantidad
- **Ganancia libre:** ingreso − costo (si es negativo, se muestra en rojo)
- **Meta diaria:** cuánto falta para llegar a tu objetivo del día
- **Reinversión:** lo que queda de tu ganancia libre para seguir invirtiendo en el negocio

## Privacidad

Todos los datos viven únicamente en este dispositivo. La app no crea cuentas, no envía información a servidores y funciona en modo avión.
