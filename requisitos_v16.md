# Especificaciones Técnicas y Requisitos de Desarrollo - Versión V16
## Sistema de Control Presupuestario y Contabilidad Centralizada (Servitel)

Este documento centraliza los requisitos funcionales, la arquitectura de software y el modelado detallado de base de datos para la versión **V16** del sistema. Esta versión introduce un Plan de Cuentas Contables unificado, validaciones estrictas de cierres de periodo, control de estabilidad transaccional e integración optimizada con Supabase y Cloudflare R2.

---

## 1. Arquitectura General y Tecnologías

El sistema está diseñado bajo el enfoque de Next.js moderno (App Router) y desacoplado de ORMs pesados (sin Prisma), interactuando de manera directa con PostgreSQL y la API de Supabase:

* **Framework Principal**: Next.js 16 (React 19, App Router).
* **Base de Datos**: Supabase (PostgreSQL 15+).
* **Acceso a Datos**: Cliente REST oficial `@supabase/supabase-js` y `@supabase/ssr`.
  * *Bypass de Seguridad (RLS)*: Utilizado estrictamente en el lado del servidor (Server Actions / API Routes) mediante la clave **Service Role** cuando se requiere auditoría del sistema o inicializaciones masivas.
  * *Políticas RLS*: Activas a nivel de tabla para aislar datos multi-empresa y roles (*Super Admin, Company Admin, Operator*).
* **Almacenamiento de Adjuntos**: Cloudflare R2 (S3 API compatible, límite de 10GB).
* **Consumo de Tasas de Cambio**: Banco Central de Venezuela (BCV Oficial) con un límite de espera (*timeout*) de 3 segundos y paso automático a **DolarAPI** como respaldo de alta disponibilidad.

---

## 2. Orden de Ejecución de Migraciones (Pipeline de Despliegue)

Para desplegar la versión V16 desde cero o sobre una versión previa (V14), las migraciones de la carpeta `supabase/migrations/` deben ejecutarse secuencialmente en el siguiente orden para respetar la integridad de las llaves foráneas y el flujo de los datos:

1. **`001_performance_indexes.sql`**: Creación de índices iniciales de rendimiento en las tablas básicas.
2. **`002_accounting_accounts_schema.sql`**: Creación de la tabla `AccountingAccount` (diseño inicial local) y tablas de mapeo secundarias.
3. **`003_global_accounting_schema.sql`**: Introducción del catálogo maestro centralizado `GlobalAccount`, tabla de activación multi-empresa `CompanyAccount`, funciones globales de contexto de sesión y backfill inicial.
4. **`004_update_category_mapping.sql`**: Vinculación de mapeos legacy (`CategoryAccountMapping`) con el nuevo ID de activación (`companyAccountId`).
5. **`005_refined_rls_policies.sql`**: Eliminación de políticas iniciales y establecimiento del aislamiento definitivo RLS multi-empresa.
6. **`006_financial_rpcs.sql`**: Carga de las funciones transaccionales de negocio (Registro, Traspasos, Ajustes, Cancelaciones, Refresco de Estados).
7. **`007_budget_period_closing.sql`**: Restricciones adicionales sobre cierres y funciones de gestión de periodos financieros.
8. **`007_mandatory_accounting_accounts.sql`**: Enlace obligatorio (`NOT NULL`) de cuentas contables a transacciones, desactivación temporal de triggers de auditoría en migración y backfill defensivo de registros huérfanos.
9. **`008_add_company_details.sql`**: Extensión de la entidad `Company` con detalles fiscales, monedas base y dirección.
10. **`009_technical_stability.sql`**: Triggers de seguridad ante borrados físicos de presupuestos/cuentas y creación de índices compuestos adicionales.
11. **`010_automated_budget_closing.sql`**: Funciones automáticas de cierre periódico por fecha (`Lazy Refresh`) y actualización masiva de estados.

---

## 3. Modelo de Datos y Esquema de Base de Datos (V16)

A continuación se detalla la estructura física de las tablas del sistema que componen la base de datos de producción:

### 3.1 Tablas del Plan de Cuentas Contables

#### Tabla: `GlobalAccount` (Catálogo Maestro Centralizado)
Centraliza todas las cuentas contables del ecosistema. Los registros se definen una única vez y mantienen una estructura jerárquica (padres e hijos).
```sql
CREATE TABLE "GlobalAccount" (
    "id" BIGSERIAL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,                -- Ejemplo: '4.1.2.01.001'
    "name" TEXT NOT NULL,                        -- Nombre de la cuenta
    "normalizedName" TEXT,                       -- Nombre normalizado para búsquedas
    "type" "AccountType" NOT NULL,               -- ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'COST', 'EXPENSE', 'PROFIT', 'DISTRIBUTION')
    "parentId" BIGINT REFERENCES "GlobalAccount"("id") ON DELETE SET NULL,
    "level" INTEGER NOT NULL DEFAULT 1,          -- Nivel de jerarquía (1 para cuentas raíz, 2, 3...)
    "isMovementAccount" BOOLEAN NOT NULL DEFAULT FALSE, -- Indica si registra movimientos financieros directos
    "isBudgetable" BOOLEAN NOT NULL DEFAULT FALSE,     -- Si se puede asignar presupuesto
    "isExecutable" BOOLEAN NOT NULL DEFAULT FALSE,     -- Si se le pueden imputar facturas/gastos
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,          -- Estado lógico
    "displayOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Tabla: `CompanyAccount` (Activación y Personalización por Empresa)
Vincula las cuentas del catálogo maestro (`GlobalAccount`) con cada empresa (`Company`) y opcionalmente las aísla por sucursal (`Branch`).
```sql
CREATE TABLE "CompanyAccount" (
    "id" BIGSERIAL PRIMARY KEY,
    "companyId" BIGINT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "globalAccountId" BIGINT NOT NULL REFERENCES "GlobalAccount"("id") ON DELETE CASCADE,
    "branchId" BIGINT REFERENCES "Branch"("id") ON DELETE SET NULL,
    "customName" TEXT,                           -- Nombre alternativo de la cuenta para esa empresa
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "isBudgetableOverride" BOOLEAN,              -- Permite forzar si es presupuestable a nivel de empresa
    "isExecutableOverride" BOOLEAN,              -- Permite forzar si es ejecutable a nivel de empresa
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "CompanyAccount_unique_activation" UNIQUE ("companyId", "globalAccountId", "branchId")
);
```

---

### 3.2 Entidades Principales Afectadas (Corte Técnico Mandatorio)

En la versión V16, todas las tablas de movimientos y asignaciones financieras deben obligatoriamente vincularse a una cuenta de empresa activa (`CompanyAccount`). **No se permiten nulos**.

#### Tabla: `BudgetAllocation` (Rubros / Asignaciones Presupuestarias)
```sql
CREATE TABLE "BudgetAllocation" (
    "id" BIGSERIAL PRIMARY KEY,
    "budgetId" BIGINT NOT NULL REFERENCES "Budget"("id") ON DELETE CASCADE,
    "companyAccountId" BIGINT NOT NULL REFERENCES "CompanyAccount"("id") ON DELETE RESTRICT, -- Cambio técnico V16 (NOT NULL)
    "categoryId" BIGINT REFERENCES "Category"("id") ON DELETE SET NULL, -- Nullable por transición legacy
    "amountUSD" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    "consumedUSD" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Tabla: `Invoice` (Gastos / Facturas)
```sql
CREATE TABLE "Invoice" (
    "id" BIGSERIAL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "amountUSD" DECIMAL(15, 2) NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED', -- 'REGISTERED', 'CANCELLED'
    "allocationId" BIGINT REFERENCES "BudgetAllocation"("id") ON DELETE SET NULL,
    "companyAccountId" BIGINT NOT NULL REFERENCES "CompanyAccount"("id") ON DELETE RESTRICT, -- Cambio técnico V16 (NOT NULL)
    "companyId" BIGINT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "registeredById" BIGINT NOT NULL REFERENCES "User"("id"),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Tabla: `Income` (Ingresos Reales)
```sql
CREATE TABLE "Income" (
    "id" BIGSERIAL PRIMARY KEY,
    "amountUSD" DECIMAL(15, 2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "companyAccountId" BIGINT NOT NULL REFERENCES "CompanyAccount"("id") ON DELETE RESTRICT, -- Cambio técnico V16 (NOT NULL)
    "companyId" BIGINT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "branchId" BIGINT REFERENCES "Branch"("id") ON DELETE SET NULL,
    "categoryId" BIGINT REFERENCES "Category"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Estrategia de Migración de Datos Legacy

Para migrar de la versión previa (esquema `AccountingAccount`) a la V16 de forma segura sin pérdida de información:

### 4.1 Replicación del Plan de Cuentas
1. Se extrae cada registro único de `AccountingAccount` por su estructura de códigos (`code`) y nombres (`name`).
2. Se insertan como registros globales maestros en `GlobalAccount` omitiendo conflictos con la directiva `ON CONFLICT (code) DO NOTHING`.
3. Se activa cada cuenta para su respectiva empresa (`companyId`) creando un registro correspondiente en `CompanyAccount`.

### 4.2 Lógica de Enlace y Re-mapeo de Movimientos
Los históricos de transacciones en `BudgetAllocation`, `Invoice`, `Income` y `BudgetAdjustment` originalmente apuntaban a la tabla `AccountingAccount` a través de la columna `accountId`. El pipeline realiza la migración mediante cruces en bloque:
```sql
UPDATE "Invoice" i
SET "companyAccountId" = ca.id
FROM "AccountingAccount" aa
JOIN "CompanyAccount" ca ON ca."companyId" = aa."companyId" 
    AND ca."globalAccountId" = (SELECT id FROM "GlobalAccount" WHERE code = aa.code)
WHERE i."accountId" = aa.id;
```
*Nota: Para asegurar que no existan facturas o ingresos huérfanos antes de aplicar la restricción estricta de `NOT NULL`, se realiza un backfill de emergencia asignando una cuenta contable comodín de la empresa en caso de que alguna transacción no tuviese mapeo previo.*

---

## 5. Constraints y Validaciones de Integridad

El sistema delega la integridad financiera directamente al motor PostgreSQL, evitando inconsistencias causadas por fallos en el servidor de aplicaciones:

### 5.1 Restricciones de Llaves Únicas y Foráneas
* **Único Presupuesto Activo**:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS "idx_single_active_budget_per_branch" 
  ON "Budget"("branchId") 
  WHERE "status" = 'ACTIVE';
  ```
  Previene lógicamente que una sucursal posea dos presupuestos activos simultáneos.
* **Activación de Cuentas**:
  ```sql
  CONSTRAINT "CompanyAccount_unique_activation" UNIQUE ("companyId", "globalAccountId", "branchId")
  ```
  Evita duplicar la asignación de una misma cuenta contable global para una sola sucursal o empresa.

### 5.2 Validaciones Cruzadas (Cross-Validations) en RPCs
* **Validación de Periodo Activo**:
  Antes de procesar un registro en `rpc_register_invoice` o actualización en `rpc_update_invoice`, el sistema consulta el estado del presupuesto:
  ```sql
  SELECT "status" INTO v_budget_status FROM "Budget" WHERE id = v_budget_id;
  IF v_budget_status != 'ACTIVE' THEN
      RAISE EXCEPTION 'Operación denegada: El periodo presupuestario está cerrado o inactivo.';
  END IF;
  ```
* **Validación de Límites Financieros**:
  Durante el registro, se valida que el monto consumido acumulado en la asignación no supere el saldo límite asignado al rubro (`amountLimitUSD`). En caso contrario, se emite una alerta o excepción dependiendo de las reglas de sobre-presupuesto parametrizadas.

---

## 6. Concurrencia y Control de Bloqueos

Dado que múltiples operadores pueden registrar facturas o traspasar fondos simultáneamente:

* **Transaccionalidad ACID**:
  Todas las funciones financieras (`rpc_transfer_budget_funds`, `rpc_register_invoice`, `rpc_update_invoice`) se ejecutan dentro de bloques de transacciones nativas de PostgreSQL (`BEGIN ... END;`).
* **Prevención de Doble Gasto (Race Conditions)**:
  Para evitar que dos facturas concurrentes consuman el mismo saldo sin validar el límite, la base de datos ejecuta actualizaciones directas en bloque:
  ```sql
  UPDATE "BudgetAllocation" 
  SET "consumedUSD" = "consumedUSD" + p_amount 
  WHERE id = p_allocation_id;
  ```
  PostgreSQL bloquea implícitamente la fila del rubro (`BudgetAllocation`) en el instante de la modificación, forzando a la segunda transacción concurrente a esperar y evaluar el saldo actualizado.

---

## 7. Bitácora y Auditoría Activa (Audit Trail)

El sistema de auditoría es totalmente pasivo y seguro, orquestado mediante triggers que capturan la traza antes de que la transacción sea confirmada:

* **Función de Auditoría (`log_audit_action`)**:
  Determina automáticamente la operación (`CREATE`, `UPDATE`, `DELETE`), la tabla origen (`TG_TABLE_NAME`) y el usuario que ejecuta la acción a través de su identificador UUID de sesión (`auth.uid()`).
* **Guardado de Diffs**:
  * Para creaciones y eliminaciones, serializa el registro completo en formato JSONB.
  * Para actualizaciones, almacena un objeto estructurado que contiene el estado anterior (`old`) y el nuevo estado (`new`) facilitando auditorías forenses sobre desvíos financieros.
* **Ejecuciones del Sistema**:
  Si la acción es iniciada por una migración de datos o servicio automático (donde `auth.uid()` es nulo), la auditoría asocia la ejecución a `'SYSTEM_MIGRATION'`.

---

## 8. Políticas de Seguridad RLS SQL (Row Level Security)

El aislamiento multi-empresa se garantiza mediante políticas RLS a nivel de base de datos. Ningún usuario puede consultar registros de otra organización, incluso si la consulta en Next.js carece de filtros.

### 8.1 Políticas de Cuentas Contables (`CompanyAccount`)
```sql
CREATE POLICY "CompanyAccount_Select" ON "CompanyAccount" 
FOR SELECT TO authenticated 
USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CompanyAccount_Admin" ON "CompanyAccount" 
FOR ALL TO authenticated 
USING (
    "companyId" = public.get_auth_user_company_id() AND 
    public.get_auth_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
);
```

### 8.2 Políticas de Movimientos Directos (`Invoice`, `Income`)
```sql
CREATE POLICY "Invoice_Select" ON "Invoice" 
FOR SELECT TO authenticated 
USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "Invoice_Insert" ON "Invoice" 
FOR INSERT TO authenticated 
WITH CHECK ("companyId" = public.get_auth_user_company_id());
```

### 8.3 Políticas de Rubros Presupuestarios (`BudgetAllocation`)
```sql
CREATE POLICY "BudgetAllocation_Select" ON "BudgetAllocation" 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM "Budget" b 
        WHERE b.id = "BudgetAllocation"."budgetId" 
        AND b."companyId" = public.get_auth_user_company_id()
    )
);
```

---

## 9. Checklist de Pruebas y Validación (QA)

Antes de realizar la entrega formal del proyecto, se deben ejecutar y aprobar los siguientes casos de prueba en la base de datos y la interfaz de usuario:

### 9.1 Control de Periodos y Bloqueos
- [ ] **CP-001**: Intentar registrar una factura en un presupuesto con estado `CLOSED`. *Resultado esperado*: Error transaccional que impida la inserción y retorne una excepción de PostgreSQL.
- [ ] **CP-002**: Intentar registrar un ingreso (`Income`) en un periodo con estado `CLOSED`. *Resultado esperado*: El ingreso debe registrarse de manera exitosa (excepción válida por lógica de caja).
- [ ] **CP-003**: Cierre automático. Configurar la fecha final de un presupuesto en el pasado. *Resultado esperado*: Al invocar `rpc_refresh_all_budgets_status()`, el presupuesto debe cambiar de forma automática a `CLOSED` y activar el presupuesto en borrador (`DRAFT`) configurado para la fecha actual si existe.

### 9.2 Integridad Contable
- [ ] **CP-004**: Intentar registrar una factura con la columna `companyAccountId` vacía o nula. *Resultado esperado*: Error de restricción `NOT NULL` a nivel de base de datos.
- [ ] **CP-005**: Tratar de eliminar físicamente (`DELETE`) una `CompanyAccount` que posea facturas históricas registradas. *Resultado esperado*: Excepción del trigger `check_movements_before_delete` impidiendo el borrado.
- [ ] **CP-006**: Tratar de eliminar físicamente un `Budget` con histórico de gastos. *Resultado esperado*: Excepción del trigger impidiendo la eliminación física.

### 9.3 Aislamiento Multi-Empresa (RLS)
- [ ] **CP-007**: Iniciar sesión con un usuario perteneciente a la Empresa A y realizar una consulta directa en la API REST de Supabase sobre la tabla `Invoice` sin filtros. *Resultado esperado*: Solo deben devolverse las facturas asociadas al `companyId` del usuario de la Empresa A.
- [ ] **CP-008**: Intentar insertar una factura en la Empresa B utilizando la sesión de un usuario de la Empresa A. *Resultado esperado*: Error de violación de políticas RLS (`WITH CHECK` constraint violation).

### 9.4 Concurrencia y Conectividad
- [ ] **CP-009**: Simular peticiones simultáneas de registro de gastos en un mismo rubro. *Resultado esperado*: Las actualizaciones del saldo consumido se deben serializar correctamente sin provocar desvíos o corrupción de datos.
- [ ] **CP-010**: Simular una caída o bloqueo del portal del BCV al procesar páginas de facturación. *Resultado esperado*: La aplicación local o en Vercel debe demorar un máximo de 3 segundos antes de rechazar la consulta al BCV y cargar la tasa de DolarAPI correctamente.
