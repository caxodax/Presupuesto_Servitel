# 📋 Pendientes para Producción - Presupuesto Servitel

Este documento detalla las tareas necesarias para alcanzar la madurez operativa y técnica necesaria para el lanzamiento a producción.

## 1. Funcionalidades Pendientes (Core)

### 🔒 Control de Periodos
- [ ] **Cierre de Mes/Año**: Implementar mecanismo para bloquear cambios en presupuestos de meses anteriores.
- [ ] **Validación de Fechas**: Evitar registros de facturas con fechas fuera del rango del presupuesto activo.

### 👥 Gestión Administrativa (UI)
- [ ] **Panel de SuperAdmin**: Interfaz para crear nuevas empresas (`Company`) y grupos de negocio.
- [ ] **Onboarding de Sucursales**: Flujo para configurar nuevas sucursales y asignarles su plan de cuentas.
- [ ] **Gestión de Usuarios**: Pantalla para invitar usuarios y asignarles roles (`OPERATOR`, `ADMIN`) por empresa.

### 📊 Reportes y Exportación
- [ ] **Exportación a Excel**: Botón para descargar el detalle de ejecución presupuestaria en formato `.xlsx`.
- [ ] **Reporte PDF**: Generación de informes ejecutivos mensuales para gerencia.
- [ ] **Filtros Avanzados**: Búsqueda por proveedor y rango de fechas cruzado entre empresas.

### 🔔 Notificaciones
- [ ] **Alertas de Umbral**: Envío automático de notificaciones (Email/Sistema) cuando un rubro llegue al 80%, 90% y 100% de consumo.

---

## 2. Estabilidad Técnica

### 🛠️ Integridad de Datos
- [ ] **Restricción de Eliminación**: Impedir el borrado de cuentas o presupuestos con movimientos históricos.
- [ ] **Logs de Auditoría de Facturas**: Asegurar que cada cambio en una factura (monto, fecha) quede registrado en `AuditLog`.

### ⚡ Rendimiento (Performance)
- [ ] **Índices SQL**: Optimizar tablas `Invoice`, `BudgetAllocation` y `BudgetAdjustment` para búsquedas rápidas por `companyId` y `date`.
- [ ] **Cacheo Estratégico**: Implementar `revalidatePath` en todos los server actions para mantener la UI sincronizada.

### 📁 Gestión de Archivos
- [ ] **Políticas de Storage**: Configurar RLS en Supabase Storage para que los adjuntos de una empresa no sean accesibles por otra.

---

## 3. Checklist de Lanzamiento (GO LIVE)

- [ ] **Sincronización SQL**: Validar que todos los RPCs en `supabase/migrations/006_financial_rpcs.sql` estén aplicados en la base de datos de producción.
- [ ] **Limpieza de Datos**: Ejecutar script de "limpieza" para eliminar datos de prueba preservando solo el Plan de Cuentas Maestro.
- [ ] **Certificados SSL**: Verificar dominios en Vercel/Hosting y Supabase.
- [ ] **Variables de Entorno**: Configurar claves de producción y deshabilitar logs de depuración.
- [ ] **Manual de Usuario**: Documentación básica para operadores de carga.

---
*Última actualización: 2026-05-13*
