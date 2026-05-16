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
- [x] **Restricción de Eliminación**: Impedir el borrado de cuentas o presupuestos con movimientos históricos.
- [x] **Logs de Auditoría de Facturas**: Asegurar que cada cambio en una factura (monto, fecha) quede registrado en `AuditLog`.

### ⚡ Rendimiento (Performance)
- [x] **Índices SQL**: Optimizar tablas `Invoice`, `BudgetAllocation` y `BudgetAdjustment` para búsquedas rápidas por `companyId` y `date`.
- [x] **Cacheo Estratégico**: Implementar `revalidatePath` en todos los server actions para mantener la UI sincronizada.

### 📁 Gestión de Archivos
- [x] **Almacenamiento en Cloudflare R2**: Se mantiene el uso de R2 debido a su capacidad gratuita de 10GB (frente a los 50MB de Supabase Storage). Los archivos se organizan por carpetas de empresa para garantizar el aislamiento lógico.

---

## 3. Checklist de Lanzamiento (GO LIVE)

- [ ] **Sincronización SQL**: Validar que todos los RPCs en `supabase/migrations/006_financial_rpcs.sql` estén aplicados en la base de datos de producción.
- [ ] **Limpieza de Datos**: Ejecutar script de "limpieza" para eliminar datos de prueba preservando solo el Plan de Cuentas Maestro.
- [ ] **Certificados SSL**: Verificar dominios en Vercel/Hosting y Supabase.
- [ ] **Variables de Entorno**: Configurar claves de producción y deshabilitar logs de depuración.
- [ ] **Manual de Usuario**: Documentación básica para operadores de carga.

---
*Última actualización: 2026-05-13*


Para lanzar el proyecto Presupuesto Servitel a producción con total confianza, aquí tienes un análisis de lo que está pendiente y lo que faltaría para el "GO LIVE":

1. Pendientes Funcionales (Lo que falta en el código)
Cierre de Periodos: Actualmente los presupuestos tienen fechas, pero no hay un botón de "Cerrar Presupuesto" que bloquee nuevos registros de facturas una vez finalizado el mes/año. Esto es vital para la integridad contable.
Gestión de Usuarios y Empresas (UI): Aunque la base de datos es multi-empresa, falta una interfaz administrativa donde el SuperAdmin pueda crear nuevas empresas, cargar sus planes de cuentas iniciales y asignar usuarios sin tocar la base de datos directamente.
Exportación de Datos: Los equipos de finanzas suelen requerir los reportes en Excel o PDF. Actualmente los reportes son visuales (gráficos), pero falta la descarga de las tablas de ejecución.
Alertas Automáticas: Tenemos la estructura de alertas, pero faltaría configurar un proceso (Cron Job) que envíe correos electrónicos cuando un presupuesto llegue al 90% de consumo.
2. Pendientes Técnicos (Para Estabilidad en Producción)
Manejo de Errores Global: Implementar una página de error 500 y 404 personalizada y robusta, y conectar un sistema de monitoreo (como Sentry) para saber si un usuario tiene un fallo en producción.
Indexación de Base de Datos: A medida que crezcan las facturas (miles de registros), las consultas podrían ponerse lentas. Falta revisar que todas las llaves foráneas y campos de búsqueda (number, supplierName, date) tengan índices optimizados.
Validación de Eliminación: Asegurar que no se puedan borrar cuentas contables o presupuestos que ya tengan transacciones asociadas (Integridad Referencial).
3. Checklist de Lanzamiento (Producción)
Limpieza de Datos: Crear un script de "Seed" limpio que solo contenga el Plan de Cuentas Maestro, sin los datos de prueba actuales.
Configuración de Dominio y SSL: Apuntar el dominio definitivo y asegurar que Supabase y Vercel (o el hosting elegido) tengan los certificados SSL activos.
Variables de Entorno: Configurar los secretos de producción (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.) en un entorno seguro.
Sincronización de SQL: Asegurarse de que TODAS las migraciones (especialmente la 006_financial_rpcs.sql que actualizamos ayer) se hayan ejecutado en la instancia de producción de Supabase.
Resumen: ¿Qué falta para hoy?
Si el objetivo es que el sistema ya sea usable por operadores:

Revisar la carga de facturas con adjuntos: Asegurarse de que el Storage de Supabase esté bien configurado (Buckets públicos/privados).
Validar el reporte consolidado: Que los montos USD/VES cuadren perfectamente.
¿Te gustaría que trabajemos en alguna de estas áreas hoy? Por ejemplo, en la gestión de cierre de periodos o en la exportación a Excel?

8:33
todo lo que me estas indicando agregalo en un nuevo archivo llamado pendientes.md
He creado y subido el archivo 

pendientes.md
 a la rama v16-cuentacontable.

En este archivo encontrarás la hoja de ruta organizada en tres bloques:

Funcionalidades Core: Lo que falta para que el sistema sea 100% autónomo (Cierre de periodos, gestión de usuarios, exportaciones).
Estabilidad Técnica: Optimizaciones de base de datos y seguridad.
Checklist de Lanzamiento: Los pasos finales antes de abrir el sistema a usuarios reales.
Con esto tienes una guía clara para las próximas sesiones. ¿Te gustaría que comencemos con alguno de estos puntos de una vez?
