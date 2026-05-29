# Plan Detallado de Optimización V16 — Sistema Presupuestario Servitel

## Objetivo

Llevar el sistema a una experiencia lo más cercana posible a **instantánea**, entendiendo que debe hacerse por fases y con medición real.  
La meta no es cambiar tecnología por cambiarla, sino eliminar cuellos de botella progresivamente:

1. Menos datos transferidos.
2. Más trabajo hecho por PostgreSQL.
3. Menos render dinámico innecesario.
4. Menos JavaScript inicial en el cliente.
5. Menos llamadas duplicadas de autenticación.
6. Más cache inteligente.
7. Workers/cron para tareas que no deben ejecutarse durante navegación.
8. Backend persistente y Redis solo cuando ya tenga sentido.

---

# 1. Principio General de Rendimiento

El sistema debe seguir esta regla:

```txt
PostgreSQL agrega, filtra y resume.
Next.js renderiza y orquesta.
El cliente solo interactúa.
Workers hacen tareas lentas o periódicas.
Redis cachea respuestas caras y repetidas.
```

Evitar este patrón:

```txt
Supabase devuelve miles de filas
+
Next.js calcula totales/rankings/reportes
+
React carga modales, gráficos y Excel desde el inicio
+
cada navegación recalcula todo
```

Buscar este patrón:

```txt
RPC/Vista SQL devuelve datos listos
+
Next.js recibe payload pequeño
+
React carga componentes pesados bajo demanda
+
cache corto con invalidación después de mutaciones
```

---

# 2. Fase 0 — Medición Obligatoria Antes de Optimizar Más

## Objetivo

Saber exactamente dónde se está yendo el tiempo.

No seguir optimizando a ciegas. Primero medir:

- Tiempo de cada query.
- Tiempo de cada Server Action.
- Tiempo de cada carga de página.
- Tamaño del bundle JS.
- Tiempo de respuesta de Supabase.
- Latencia entre Vercel y Supabase.

## Archivos principales a instrumentar

```txt
src/features/dashboard/server/queries.ts
src/features/reports/server/queries.ts
src/features/invoices/server/queries.ts
src/features/budgets/server/queries.ts
src/features/incomes/server/queries.ts
src/lib/auth.ts
middleware.ts
```

## Implementación simple de medición

Crear helper:

```ts
// src/lib/perf.ts
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()

  try {
    return await fn()
  } finally {
    const duration = Math.round(performance.now() - start)

    if (process.env.NODE_ENV !== "production" || duration > 500) {
      console.log(`[PERF] ${label}: ${duration}ms`)
    }
  }
}
```

Uso:

```ts
return measureAsync("getDashboardKpis", async () => {
  const { data, error } = await supabase.rpc("rpc_dashboard_kpis")
  if (error) throw error
  return data
})
```

## Qué medir

| Función | Meta ideal | Alerta |
|---|---:|---:|
| `getDashboardKpis` | < 150 ms | > 500 ms |
| `getExecutiveAnalytics` | < 250 ms | > 700 ms |
| `getRecentActivity` | < 150 ms | > 500 ms |
| `getInvoices` | < 250 ms | > 800 ms |
| `getBudgets` | < 250 ms | > 800 ms |
| `getBudgetDetails` | < 400 ms | > 1200 ms |
| `getConsolidatedReport` | < 500 ms | > 1500 ms |
| `getFinancialTreeReport` | < 500 ms | > 1500 ms |
| `requireAuth` | < 100 ms | > 300 ms |

## Criterio de salida

No avanzar a backend externo hasta tener una tabla real de tiempos.

---

# 3. Fase 1 — Reportes por RPC/Vistas SQL

## Prioridad

Muy alta.

Los reportes son normalmente el siguiente cuello después del dashboard.

## Problema

Si los reportes hacen esto:

```txt
Consultar Income
Consultar Invoice
Consultar BudgetAllocation
Consultar GlobalAccount
Consultar CompanyAccount
Procesar todo en JavaScript
```

se volverán lentos cuando crezca la data.

## Objetivo

Reemplazar procesamiento pesado en Next.js por RPCs SQL.

## RPCs recomendadas

Crear migración:

```txt
supabase/migrations/XXX_reports_optimization.sql
```

Con funciones:

```txt
rpc_report_summary
rpc_report_daily_flow
rpc_report_breakdown_by_branch
rpc_report_account_analysis
rpc_report_budget_efficiency
rpc_financial_tree_report
```

---

## 3.1 RPC: resumen general

```sql
CREATE OR REPLACE FUNCTION public.rpc_report_summary(
  p_company_id BIGINT DEFAULT NULL,
  p_branch_id BIGINT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_balance NUMERIC,
  total_budget NUMERIC,
  total_consumed NUMERIC,
  execution_percentage NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH income_sum AS (
    SELECT COALESCE(SUM(i."amountUSD"), 0) AS total
    FROM "Income" i
    WHERE (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR i."branchId" = p_branch_id)
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
  ),
  expense_sum AS (
    SELECT COALESCE(SUM(i."amountUSD"), 0) AS total
    FROM "Invoice" i
    LEFT JOIN "BudgetAllocation" ba ON ba.id = i."allocationId"
    LEFT JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE i."status" <> 'CANCELLED'
      AND (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR b."branchId" = p_branch_id)
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
  ),
  budget_sum AS (
    SELECT
      COALESCE(SUM(ba."amountUSD"), 0) AS total_budget,
      COALESCE(SUM(ba."consumedUSD"), 0) AS total_consumed
    FROM "BudgetAllocation" ba
    JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE (p_company_id IS NULL OR b."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR b."branchId" = p_branch_id)
  )
  SELECT
    inc.total AS total_income,
    exp.total AS total_expenses,
    inc.total - exp.total AS net_balance,
    bud.total_budget,
    bud.total_consumed,
    CASE
      WHEN bud.total_budget > 0 THEN ROUND((bud.total_consumed / bud.total_budget) * 100, 2)
      ELSE 0
    END AS execution_percentage
  FROM income_sum inc, expense_sum exp, budget_sum bud;
$$;
```

---

## 3.2 RPC: flujo diario para gráficos

```sql
CREATE OR REPLACE FUNCTION public.rpc_report_daily_flow(
  p_company_id BIGINT DEFAULT NULL,
  p_branch_id BIGINT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  day DATE,
  income NUMERIC,
  expenses NUMERIC,
  net NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH days AS (
    SELECT generate_series(
      COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days'),
      COALESCE(p_date_to, CURRENT_DATE),
      INTERVAL '1 day'
    )::date AS day
  ),
  incomes AS (
    SELECT i."date" AS day, SUM(i."amountUSD") AS amount
    FROM "Income" i
    WHERE (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR i."branchId" = p_branch_id)
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
    GROUP BY i."date"
  ),
  expenses AS (
    SELECT inv."date" AS day, SUM(inv."amountUSD") AS amount
    FROM "Invoice" inv
    LEFT JOIN "BudgetAllocation" ba ON ba.id = inv."allocationId"
    LEFT JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE inv."status" <> 'CANCELLED'
      AND (p_company_id IS NULL OR inv."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR b."branchId" = p_branch_id)
      AND (p_date_from IS NULL OR inv."date" >= p_date_from)
      AND (p_date_to IS NULL OR inv."date" <= p_date_to)
    GROUP BY inv."date"
  )
  SELECT
    d.day,
    COALESCE(i.amount, 0) AS income,
    COALESCE(e.amount, 0) AS expenses,
    COALESCE(i.amount, 0) - COALESCE(e.amount, 0) AS net
  FROM days d
  LEFT JOIN incomes i ON i.day = d.day
  LEFT JOIN expenses e ON e.day = d.day
  ORDER BY d.day;
$$;
```

---

## 3.3 RPC: análisis por cuenta contable

```sql
CREATE OR REPLACE FUNCTION public.rpc_report_account_analysis(
  p_company_id BIGINT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  company_account_id BIGINT,
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  invoice_count BIGINT,
  total_expenses NUMERIC,
  total_income NUMERIC,
  net_amount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH expenses AS (
    SELECT
      i."companyAccountId",
      COUNT(*) AS invoice_count,
      SUM(i."amountUSD") AS total_expenses
    FROM "Invoice" i
    WHERE i."status" <> 'CANCELLED'
      AND (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
    GROUP BY i."companyAccountId"
  ),
  incomes AS (
    SELECT
      i."companyAccountId",
      SUM(i."amountUSD") AS total_income
    FROM "Income" i
    WHERE (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
    GROUP BY i."companyAccountId"
  )
  SELECT
    ca.id AS company_account_id,
    ga.code AS account_code,
    COALESCE(ca."customName", ga.name) AS account_name,
    ga.type::text AS account_type,
    COALESCE(e.invoice_count, 0) AS invoice_count,
    COALESCE(e.total_expenses, 0) AS total_expenses,
    COALESCE(inc.total_income, 0) AS total_income,
    COALESCE(inc.total_income, 0) - COALESCE(e.total_expenses, 0) AS net_amount
  FROM "CompanyAccount" ca
  JOIN "GlobalAccount" ga ON ga.id = ca."globalAccountId"
  LEFT JOIN expenses e ON e."companyAccountId" = ca.id
  LEFT JOIN incomes inc ON inc."companyAccountId" = ca.id
  WHERE (p_company_id IS NULL OR ca."companyId" = p_company_id)
  ORDER BY ABS(COALESCE(inc.total_income, 0) - COALESCE(e.total_expenses, 0)) DESC;
$$;
```

## Cambios en Next.js

Reemplazar:

```txt
src/features/reports/server/queries.ts
```

Para que llame las RPCs y deje de traer filas crudas.

## Criterio de aceptación

- Reportes abren en menos de 1 segundo con data moderada.
- Payload de reportes baja considerablemente.
- El servidor ya no procesa miles de filas en JS.

---

# 4. Fase 2 — Recent Activity como Vista Liviana

## Problema

La actividad reciente suele tener joins anidados y puede seguir arrastrando `AccountingAccount`.

## Objetivo

Crear una vista ya lista para pintar.

## Migración

```sql
CREATE OR REPLACE VIEW public.recent_activity_view AS
SELECT
  i.id,
  i.number,
  i."supplierName",
  i."amountUSD",
  i.date,
  i.status,
  i."companyId",
  c.name AS "companyName",
  u.name AS "registeredByName",
  ga.code AS "accountCode",
  ga.name AS "accountName",
  br.id AS "branchId",
  br.name AS "branchName",
  i."createdAt"
FROM "Invoice" i
LEFT JOIN "Company" c ON c.id = i."companyId"
LEFT JOIN "User" u ON u.id = i."registeredById"
LEFT JOIN "CompanyAccount" ca ON ca.id = i."companyAccountId"
LEFT JOIN "GlobalAccount" ga ON ga.id = ca."globalAccountId"
LEFT JOIN "BudgetAllocation" ba ON ba.id = i."allocationId"
LEFT JOIN "Budget" b ON b.id = ba."budgetId"
LEFT JOIN "Branch" br ON br.id = b."branchId";
```

## Índice recomendado

```sql
CREATE INDEX IF NOT EXISTS "idx_invoice_recent_activity"
ON "Invoice"("companyId", "createdAt" DESC);
```

## Query en Next.js

```ts
const { data, error } = await supabase
  .from("recent_activity_view")
  .select("*")
  .eq("companyId", companyId)
  .order("createdAt", { ascending: false })
  .limit(6)
```

## Criterio de aceptación

- `getRecentActivity()` debe tardar menos de 150-250 ms.
- No debe consultar `AccountingAccount`.
- No debe traer objetos anidados innecesarios.

---

# 5. Fase 3 — Eliminar Legacy `AccountingAccount` del Runtime

## Objetivo

Que la app V16 no ejecute joins ni fallbacks contra `AccountingAccount`.

## Se permite

`AccountingAccount` puede quedar solo para:

```txt
migraciones históricas
backfill
auditoría de transición
```

## No se permite

No debe aparecer en:

```txt
queries runtime
dashboard
presupuestos
facturas
reportes
vistas actuales
RPCs actuales
componentes UI
```

## Buscar referencias

```bash
grep -R "AccountingAccount" src supabase/migrations
```

## Acciones

1. Reemplazar `AccountingAccount` por:
   ```txt
   CompanyAccount -> GlobalAccount
   ```

2. Quitar fallback legacy de vistas nuevas.

3. Verificar que `BudgetAllocation.companyAccountId`, `Invoice.companyAccountId` e `Income.companyAccountId` sean la fuente principal.

## Criterio de aceptación

```txt
grep -R "AccountingAccount" src
```

Debe devolver cero resultados, o solo comentarios obsoletos a eliminar.

---

# 6. Fase 4 — Auth y Middleware Más Livianos

## Problema

Si el middleware ejecuta `supabase.auth.getUser()` y luego cada página ejecuta `requireAuth()`, hay trabajo duplicado.

## Objetivo

Reducir llamadas de auth por navegación.

## Revisión actual

Buscar:

```txt
middleware.ts
src/lib/auth.ts
src/lib/supabase/middleware.ts
```

## Opciones

### Opción A — Middleware mínimo

El middleware solo refresca sesión/cookies, pero no hace lógica pesada de usuario.

```ts
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}
```

Evitar consultas a tabla `User` dentro del middleware.

### Opción B — Limitar matcher

No aplicar middleware a toda la app.

```ts
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*"
  ],
}
```

### Opción C — Cachear usuario de app

En `requireAuth()`, usar `React.cache()` para deduplicar dentro del request:

```ts
import { cache } from "react"

export const requireAuth = cache(async () => {
  // getUser + query User
})
```

## Criterio de aceptación

- Una navegación protegida no debe hacer múltiples consultas redundantes de usuario.
- `requireAuth` debe estar por debajo de 100-150 ms.
- Middleware no debe ser un cuello constante.

---

# 7. Fase 5 — Cache Corto e Invalidación Inteligente

## Problema

`force-dynamic` recalcula todo en cada navegación.

## Objetivo

Cachear lo que se repite, invalidar después de cambios.

## Reglas

| Dato | Cache sugerido |
|---|---:|
| KPIs dashboard | 15-30 s |
| Actividad reciente | 15-30 s |
| Catálogo de cuentas | 5-15 min |
| Empresas/sucursales | 5-15 min |
| Reportes filtrados | 30-120 s |
| Detalle de factura | Sin cache o cache corto |
| Formularios de creación | Catálogos cacheados |

## Cambiar dashboard

En vez de:

```ts
export const dynamic = "force-dynamic"
```

Probar:

```ts
export const revalidate = 30
```

O usar `unstable_cache`:

```ts
import { unstable_cache } from "next/cache"

export const getCachedDashboardKpis = unstable_cache(
  async (companyId: number | null) => {
    // rpc_dashboard_kpis
  },
  ["dashboard-kpis"],
  {
    revalidate: 30,
    tags: ["dashboard"]
  }
)
```

Después de registrar factura o ingreso:

```ts
import { revalidateTag, revalidatePath } from "next/cache"

revalidateTag("dashboard")
revalidatePath("/dashboard")
```

## Criterio de aceptación

- Segunda navegación al dashboard debe sentirse casi instantánea.
- Después de registrar factura/ingreso, los datos deben actualizarse correctamente.
- No cachear datos sensibles sin separar por empresa/usuario.

---

# 8. Fase 6 — Lazy Load Real de Componentes Pesados

## Problema

Algunas pantallas cargan componentes pesados aunque el usuario no los use.

## Componentes candidatos

```txt
InvoiceModal
IncomeModal
CreateBudgetModal
FundTransferModal
AdjustmentLogModal
ReportsCharts
PDF export
Excel export
Recharts
XLSX
React Hook Form pesado
Selectores complejos
```

## Patrón recomendado

```ts
import dynamic from "next/dynamic"

const InvoiceModal = dynamic(
  () => import("@/components/facturas/InvoiceModal").then(m => m.InvoiceModal),
  {
    ssr: false,
    loading: () => null,
  }
)
```

## Excel bajo demanda

Evitar:

```ts
import * as XLSX from "xlsx"
```

Usar:

```ts
async function exportToExcel() {
  const XLSX = await import("xlsx")
  // generar archivo
}
```

## Gráficos bajo demanda

```ts
const ReportsCharts = dynamic(() => import("./ReportsCharts"), {
  ssr: false,
  loading: () => <ReportsSkeleton />
})
```

## Criterio de aceptación

- La pantalla de facturas no debe cargar el modal completo hasta abrirlo.
- Reportes no debe cargar `xlsx` hasta exportar.
- Gráficos pesados deben estar separados del shell inicial.

---

# 9. Fase 7 — Optimizar Detalles de Presupuesto

## Problema

`getBudgetDetails()` puede traer:

```txt
header
company
branch
allocations
accounts
adjustments
recordedBy
logs
```

aunque la pantalla solo muestre una parte inicialmente.

## Objetivo

Dividir en queries pequeñas.

## Nuevo diseño

```txt
getBudgetHeader(budgetId)
getBudgetStats(budgetId)
getBudgetAllocations(budgetId, pagination)
getRecentAdjustments(budgetId, limit = 5)
getAllAdjustments(budgetId) solo al abrir modal/historial
```

## Evitar

```ts
const recentAdjustments = allAdjustments.slice(0, 5)
```

Eso trae todo para mostrar cinco.

## Usar

```ts
const { data } = await supabase
  .from("BudgetAdjustment")
  .select("*")
  .eq("budgetId", budgetId)
  .order("createdAt", { ascending: false })
  .limit(5)
```

## Criterio de aceptación

- Detalle de presupuesto carga rápido.
- Historial completo se carga solo bajo demanda.
- No traer arrays gigantes en la carga inicial.

---

# 10. Fase 8 — Índices Avanzados y Revisión con EXPLAIN

## Objetivo

Asegurar que PostgreSQL use índices.

## Índices recomendados

### Facturas

```sql
CREATE INDEX IF NOT EXISTS "idx_invoice_company_date_status"
ON "Invoice"("companyId", "date" DESC, "status");

CREATE INDEX IF NOT EXISTS "idx_invoice_company_created"
ON "Invoice"("companyId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_invoice_allocation"
ON "Invoice"("allocationId");

CREATE INDEX IF NOT EXISTS "idx_invoice_company_account"
ON "Invoice"("companyAccountId");
```

### Ingresos

```sql
CREATE INDEX IF NOT EXISTS "idx_income_company_date"
ON "Income"("companyId", "date" DESC);

CREATE INDEX IF NOT EXISTS "idx_income_branch_date"
ON "Income"("branchId", "date" DESC);

CREATE INDEX IF NOT EXISTS "idx_income_company_account"
ON "Income"("companyAccountId");
```

### Presupuestos

```sql
CREATE INDEX IF NOT EXISTS "idx_budget_company_branch_status"
ON "Budget"("companyId", "branchId", "status");

CREATE INDEX IF NOT EXISTS "idx_budget_branch_status_dates"
ON "Budget"("branchId", "status", "initialDate", "finalDate");
```

### Asignaciones

```sql
CREATE INDEX IF NOT EXISTS "idx_budget_allocation_budget"
ON "BudgetAllocation"("budgetId");

CREATE INDEX IF NOT EXISTS "idx_budget_allocation_company_account"
ON "BudgetAllocation"("companyAccountId");
```

### Búsquedas con ILIKE

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "idx_invoice_supplier_trgm"
ON "Invoice" USING gin ("supplierName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_invoice_number_trgm"
ON "Invoice" USING gin ("number" gin_trgm_ops);
```

## Verificar con EXPLAIN

Ejemplo:

```sql
EXPLAIN ANALYZE
SELECT *
FROM "Invoice"
WHERE "companyId" = 1
ORDER BY "createdAt" DESC
LIMIT 20;
```

## Criterio de aceptación

- Queries principales no deben hacer `Seq Scan` sobre tablas grandes.
- Listados deben responder en menos de 250-500 ms.
- Búsquedas deben mejorar con volumen alto.

---

# 11. Fase 9 — Workers y Cron Jobs

## Problema

Cierres automáticos, tasas BCV/DolarAPI y reportes no deben ejecutarse durante navegación normal.

## Objetivo

Sacar tareas periódicas de las páginas.

## Tareas candidatas

```txt
Cierre automático de presupuestos
Sincronización de tasas BCV/DolarAPI
Generación de reportes pesados
Precalculo de dashboards
Limpieza de auditoría
Recalculo de saldos
```

## Implementación inicial con Vercel Cron

```ts
// src/app/api/cron/refresh-budgets/route.ts

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  // llamar rpc_refresh_all_budgets_status
  return Response.json({ ok: true })
}
```

`vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-budgets",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/cron/sync-exchange-rates",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Criterio de aceptación

- Ningún listado debe ejecutar refresh global.
- Las tasas deben estar precargadas.
- El cierre de presupuestos no debe depender de abrir una pantalla.

---

# 12. Fase 10 — Redis Cache Opcional

## Cuándo implementar Redis

Solo después de medir y confirmar que las RPCs/reportes se repiten mucho o son caros.

Redis ayuda si:

```txt
Dashboard lo consultan muchos usuarios
Reportes se repiten con mismos filtros
Tasas de cambio se consultan constantemente
Catálogos cambian poco
Hay mucha concurrencia
```

## Candidatos a cache Redis

```txt
dashboard:{companyId}
report:summary:{companyId}:{branchId}:{from}:{to}
exchange-rate:latest
accounts:{companyId}
branches:{companyId}
```

## TTL sugerido

| Dato | TTL |
|---|---:|
| Dashboard | 15-60 s |
| Reportes | 60-300 s |
| Catálogos | 10-60 min |
| Tasas BCV/DolarAPI | 1-6 h |
| Sucursales/empresas | 10-60 min |

## Stack recomendado

```txt
Upstash Redis
o
Redis administrado en Railway/Fly/Render
```

## Ejemplo

```ts
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

export async function getCachedReport(key: string, fetcher: () => Promise<any>) {
  const cached = await redis.get(key)
  if (cached) return cached

  const data = await fetcher()
  await redis.set(key, data, { ex: 60 })

  return data
}
```

## Invalidación

Después de:

```txt
registrar factura
cancelar factura
registrar ingreso
transferir fondos
crear presupuesto
cerrar presupuesto
```

Eliminar claves relacionadas:

```ts
await redis.del(`dashboard:${companyId}`)
```

O usar patrones si el proveedor lo permite.

---

# 13. Fase 11 — Backend Persistente Opcional

## No migrar todo de golpe

La arquitectura recomendada no es reescribir toda la app.

Primero separar solo lo pesado:

```txt
Next.js:
- UI
- páginas
- formularios
- navegación
- server actions simples

Backend persistente:
- reportes pesados
- dashboard precalculado
- PDFs/Excel
- cron jobs
- cache Redis
- integración BCV/DolarAPI
```

## Opción recomendada: NestJS

Buena si quieres TypeScript completo.

```txt
apps/web        -> Next.js
apps/api        -> NestJS
packages/shared -> tipos y validaciones
```

Endpoints:

```txt
GET /dashboard/summary
GET /reports/consolidated
GET /reports/financial-tree
POST /jobs/refresh-budgets
POST /jobs/sync-rates
POST /exports/report-excel
POST /exports/report-pdf
```

## Opción Go

Buena si quieres máximo rendimiento y bajo consumo.

Ideal para:

```txt
reportes
workers
cron
cache
exports
```

Pero exige más disciplina y más trabajo.

## Opción Laravel/Django

Buena si prefieres backend tradicional y panel administrativo robusto.

## Cuándo pasar a backend persistente

Solo si después de las fases anteriores:

```txt
Reportes siguen > 1.5s
Dashboard sigue > 800ms
Hay alta concurrencia
Hay límites serverless
Hay tareas largas
PDF/Excel tarda mucho
Necesitas jobs confiables
```

---

# 14. Fase 12 — Materialized Views para Reportes Muy Pesados

## Cuándo usarlas

Si los reportes siguen lentos incluso con RPCs.

## Ejemplo

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_daily_financial_summary AS
SELECT
  i."companyId",
  i."date",
  SUM(i."amountUSD") AS total_income,
  0::numeric AS total_expenses
FROM "Income" i
GROUP BY i."companyId", i."date"

UNION ALL

SELECT
  inv."companyId",
  inv."date",
  0::numeric AS total_income,
  SUM(inv."amountUSD") AS total_expenses
FROM "Invoice" inv
WHERE inv."status" <> 'CANCELLED'
GROUP BY inv."companyId", inv."date";
```

Refresco:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_financial_summary;
```

Requiere índice único para concurrent refresh.

## Criterio de aceptación

- Reportes históricos abren casi instantáneos.
- Refresco corre por cron, no durante navegación.

---

# 15. Fase 13 — Optimización de UX Percibida

Aunque el backend mejore, la app debe sentirse rápida.

## Acciones

1. Skeletons inmediatos.
2. Optimistic UI en acciones simples.
3. Prefetch de rutas principales.
4. Mantener filtros en URL.
5. Cargar tabla primero y gráficos después.
6. Mostrar headers/KPIs antes que detalles.
7. Evitar bloquear toda la pantalla por un modal pesado.

## Ejemplo

```txt
Dashboard:
- render shell inmediato
- KPIs
- actividad reciente
- rankings
- gráficos secundarios
```

No todo debe bloquear el primer render.

---

# 16. Orden Recomendado de Implementación

## Sprint 1 — Medición y reportes

```txt
[ ] Agregar measureAsync
[ ] Medir dashboard/listados/reportes/auth
[ ] Crear RPC report_summary
[ ] Crear RPC report_daily_flow
[ ] Crear RPC report_account_analysis
[ ] Reescribir getConsolidatedReport
```

## Sprint 2 — Dashboard residual y legacy

```txt
[ ] Crear recent_activity_view
[ ] Cambiar getRecentActivity
[ ] Eliminar AccountingAccount del runtime
[ ] Verificar grep en src
```

## Sprint 3 — Auth/cache/lazy

```txt
[ ] Reducir middleware
[ ] Evitar getUser duplicado
[ ] Cambiar force-dynamic por revalidate/cache controlado
[ ] Lazy-load modales completos
[ ] Lazy-load XLSX
[ ] Separar charts de reportes
```

## Sprint 4 — Presupuestos y detalles

```txt
[ ] Dividir getBudgetDetails
[ ] Ajustes recientes con limit(5)
[ ] Historial completo bajo demanda
[ ] Revisar payloads de BudgetAllocation
```

## Sprint 5 — Cron/workers

```txt
[ ] Cierre presupuestario por cron
[ ] Sync tasas por cron
[ ] Precalculo opcional dashboard/reportes
```

## Sprint 6 — Redis/backend externo si hace falta

```txt
[ ] Evaluar tiempos después de fases 1-5
[ ] Implementar Redis para dashboard/reportes
[ ] Separar API persistente solo para tareas pesadas si todavía hace falta
```

---

# 17. Metas Finales de Rendimiento

| Pantalla/acción | Meta |
|---|---:|
| Dashboard segunda carga | < 300 ms percibidos |
| Dashboard primera carga | < 800 ms |
| Listado facturas | < 500 ms |
| Buscar factura | < 500 ms |
| Registrar factura | < 800 ms |
| Cancelar factura | < 800 ms |
| Reporte consolidado | < 1000 ms |
| Reporte cacheado | < 300 ms |
| Detalle presupuesto | < 800 ms |
| Abrir modal | < 150 ms percibidos |
| Export Excel/PDF | bajo demanda, no bloquear navegación |

---

# 18. Regla de Decisión: ¿Cuándo Cambiar Arquitectura?

No cambiar a NestJS/Laravel/Django/Go solo por sensación.

Cambiar cuando se cumplan 2 o más:

```txt
[ ] Reportes > 1.5s después de RPCs
[ ] Dashboard > 800ms después de cache
[ ] Server Actions se acercan a límites serverless
[ ] Cron de Vercel se queda corto
[ ] PDF/Excel tarda demasiado
[ ] Muchos usuarios concurrentes
[ ] Necesidad clara de Redis compartido
[ ] Necesidad de workers persistentes
```

Si no, seguir con:

```txt
Next.js + Supabase + RPCs + cache + cron
```

---

# 19. Conclusión

El sistema puede sentirse mucho más rápido sin cambiar inmediatamente de stack.

La ruta correcta es:

```txt
Primero medir.
Después mover reportes y agregados a PostgreSQL.
Luego reducir auth duplicado y bundle cliente.
Después cachear con invalidación.
Luego sacar tareas periódicas a cron.
Finalmente Redis/backend persistente solo si las métricas lo justifican.
```

La meta de “casi instantáneo” se logra acumulando varias mejoras pequeñas y una grande:

```txt
La mejora grande:
menos data cruda y más RPC/vistas SQL.

Las mejoras pequeñas:
cache, lazy-load, auth liviano, índices, cron, UX percibida.
```
