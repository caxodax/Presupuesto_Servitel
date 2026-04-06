# PROJECT MASTER SPEC
## Plataforma Web de Control Presupuestario Multiempresa

### Estado del documento
Documento maestro de especificación, arquitectura, prioridades, reglas de negocio, lineamientos de performance, seguridad, UX y orden de ejecución del proyecto.

### Instrucción principal para la IA
Debes leer y comprender este documento completo antes de responder.

**No debes generar código al inicio.**
Primero debes consolidar el entendimiento del proyecto, detectar inconsistencias, proponer la arquitectura final del MVP y trabajar por fases.

**Después de cada fase debes detenerte y esperar aprobación explícita antes de continuar.**

**Solo podrás comenzar a generar código cuando se te indique expresamente.**

---

# 1. Visión general del proyecto

Quiero construir una plataforma web profesional para reemplazar y superar una lógica de control presupuestario que actualmente se maneja en Excel.

No quiero copiar visualmente el Excel.
Sí quiero conservar y mejorar su lógica de negocio.

La plataforma debe ser:

- moderna
- premium
- ultra rápida
- muy profesional
- escalable
- multiempresa
- responsiva
- segura
- con excelente experiencia de usuario

Debe sentirse como un producto SaaS premium de gestión empresarial, no como un panel administrativo genérico.

---

# 2. Objetivo del sistema

El sistema debe permitir:

- administrar múltiples empresas
- administrar múltiples sucursales por empresa
- asignar presupuestos por período:
  - mensual
  - trimestral
  - semestral
  - anual
- registrar facturas o gastos
- descontar automáticamente esos gastos del presupuesto correspondiente
- permitir excedentes sin bloquear el registro
- mostrar claramente el monto excedido
- tener una super administración que pueda:
  - ver todas las empresas
  - ver todas las sucursales
  - administrarlas
  - auditarlas
  - ver consumo actual
  - ajustar presupuestos
  - reducir o aumentar presupuesto
- manejar roles y permisos
- auditar acciones relevantes
- mostrar dashboards ejecutivos
- mantener velocidad percibida muy alta

---

# 3. Contexto de negocio

Actualmente el flujo existe en Excel.
La nueva aplicación web debe transformar esa lógica en una experiencia mucho más robusta, rápida, auditable y profesional.

Escenario actual:
- hoy se manejan 5 empresas
- proyección inicial: 30 empresas

La aplicación debe diseñarse bien desde el inicio, pero evitando sobreingeniería innecesaria.

---

# 4. Filosofía de producto

Este producto no es una simple web informativa.
Es software de gestión.

Debe cumplir con estos principios:

- mantener lógica de negocio clara
- excelente UX
- velocidad real y percibida
- frontend premium
- seguridad
- trazabilidad
- mantenibilidad
- arquitectura compacta pero seria
- escalabilidad sin reescribir todo

---

# 5. Stack tecnológico definitivo

Usar este stack como base obligatoria:

- Next.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- shadcn/ui
- autenticación integrada moderna
- arquitectura full-stack dentro de Next.js

Se permite usar storage para soportes de facturas en una fase posterior, pero no debe complicar innecesariamente la v1.

No quiero una solución low-code.
No quiero una arquitectura fragmentada con demasiadas herramientas innecesarias.

---

# 6. Base de datos

La base de datos debe ser PostgreSQL.

Razones:
- excelente integridad relacional
- muy buena para sistemas de negocio
- muy buena para auditoría
- muy buena para consultas agregadas
- flexible para crecimiento
- robusta para multiempresa
- costo razonable
- muy buen equilibrio entre rendimiento y escalabilidad

La base de datos debe diseñarse desde el inicio para:
- consultas rápidas
- índices adecuados
- relaciones claras
- timestamps estándar
- estados lógicos
- transacciones consistentes
- auditoría seria

---

# 7. Seguridad y cifrado

El sistema debe estar correctamente protegido.

Obligatorio:
- HTTPS/TLS
- conexiones seguras a la base de datos
- hash seguro de contraseñas
- sesiones seguras
- protección de rutas
- control de roles y permisos
- trazabilidad de acciones críticas
- eliminación lógica cuando aplique
- protección de datos sensibles si aplica

Aclaración:
El cifrado y la seguridad no dependen de usar PHP.
La seguridad debe implementarse correctamente con el stack definido.

---

# 8. Principios de rendimiento

La app debe sentirse extremadamente rápida.

La velocidad percibida es tan importante como la real.

Reglas obligatorias:

## 8.1 Operación diaria
- carga parcial
- respuesta inmediata
- actualizaciones localizadas
- no bloquear pantalla completa por acciones pequeñas

## 8.2 Dashboard
- cargar primero KPIs críticos
- luego gráficos y bloques secundarios
- no hacer esperar toda la pantalla por consultas pesadas

## 8.3 Reportes pesados
- consultas paralelas/asíncronas
- render consolidado cuando el bloque completo esté listo
- usar skeletons premium durante la carga

## 8.4 Tablas
- paginación obligatoria
- filtros asíncronos
- no cargar miles de registros de una sola vez

## 8.5 Caché
- caché alta para catálogos
- caché corta para KPIs
- mínima caché para transacciones críticas

## 8.6 UX de carga
- skeletons elegantes por bloque
- no loaders bruscos de pantalla completa
- mantener contexto visual
- feedback inmediato al guardar

---

# 9. Reglas de negocio principales

## 9.1 Multiempresa
- el sistema maneja varias empresas
- cada empresa puede tener varias sucursales
- el super admin puede ver todo
- usuarios normales solo ven lo que les corresponde según su scope

## 9.2 Presupuestos
- deben poder configurarse por período:
  - mensual
  - trimestral
  - semestral
  - anual
- pueden asignarse a empresa
- pueden asignarse a sucursal
- pueden distribuirse por categoría y subcategoría
- deben permitir ajustes
- debe quedar histórico de ajustes
- deben mostrar:
  - total asignado
  - consumido
  - disponible
  - excedido
  - porcentaje ejecutado

## 9.3 Facturas / gastos
- se registran manualmente en la v1
- cada factura pertenece a:
  - empresa
  - sucursal opcional
  - categoría
  - subcategoría opcional
  - período presupuestario
- al registrarse:
  - reduce el presupuesto disponible
  - recalcula consumido
  - recalcula disponible
  - recalcula excedente si aplica
- si excede el presupuesto:
  - no bloquear
  - sí mostrar claramente el excedente
  - sí dejar trazabilidad

## 9.4 Auditoría
- debe registrarse:
  - quién hizo la acción
  - qué entidad cambió
  - qué acción se ejecutó
  - cuándo ocurrió
  - valores previos/nuevos cuando aplique
- debe consultarse por filtros
- debe estar separada del flujo caliente del dashboard

## 9.5 Frontend
- totalmente responsivo
- premium
- moderno
- limpio
- ejecutivo
- profesional

---

# 10. Roles del sistema

Diseñar al menos estos roles:

## Super Admin
- ve todo
- administra empresas
- administra sucursales
- administra usuarios
- asigna y ajusta presupuestos
- ve consumo global
- audita
- gestiona configuración sensible

## Admin Empresa
- ve solo su empresa y sus sucursales
- administra lo permitido dentro de su alcance
- registra facturas
- revisa presupuestos
- consulta consumo

## Operador
- registra facturas
- consulta datos operativos
- no modifica configuraciones críticas

## Auditor
- consulta trazabilidad
- revisa consumos
- revisa ajustes
- no necesariamente edita

## Consulta
- solo lectura

---

# 11. Módulos del MVP v1

La primera versión debe incluir:

1. Autenticación
2. Gestión de usuarios y roles
3. Gestión de empresas
4. Gestión de sucursales
5. Gestión de categorías y subcategorías
6. Gestión de presupuestos
7. Registro de facturas
8. Listado de facturas
9. Dashboard principal
10. Auditoría básica

Fuera de v1 por ahora:
- OCR
- flujos complejos de aprobación
- automatizaciones avanzadas
- forecasting predictivo
- BI avanzado
- integraciones externas

---

# 12. Modelo funcional del presupuesto

Cada presupuesto debe contemplar:

- empresa o sucursal
- tipo de período
- fecha inicio
- fecha fin
- monto total
- distribución por categoría
- distribución por subcategoría opcional
- consumo acumulado
- monto disponible
- monto excedido
- estado

Cuando se registra una factura:
1. identificar empresa o sucursal
2. identificar categoría/subcategoría
3. identificar período presupuestario activo
4. descontar monto
5. recalcular indicadores

---

# 13. Pantallas principales

Diseñar y construir estas pantallas:

1. Login
2. Dashboard principal
3. Empresas
4. Sucursales
5. Presupuestos
6. Registro de facturas
7. Listado de facturas
8. Detalle de factura
9. Auditoría
10. Usuarios y permisos

Cada pantalla debe definirse en términos de:
- objetivo funcional
- componentes visuales
- fuentes de datos
- estrategia de carga
- comportamiento async
- estrategia de caché
- respuesta percibida

---

# 14. Comportamiento por pantalla

## 14.1 Login
- carga casi instantánea
- formulario limpio
- feedback inmediato en submit
- no recargar toda la página por error

## 14.2 Dashboard
- cargar primero:
  - presupuesto total
  - consumido
  - disponible
  - excedente
- luego:
  - alertas
  - ranking
  - tendencias
  - gráficos
- usar carga por bloques
- no bloquear por gráficos pesados

## 14.3 Empresas
- tabla paginada
- filtros rápidos
- búsqueda asíncrona
- edición sin recarga completa

## 14.4 Sucursales
- dependiente de empresa
- filtros rápidos
- tabla parcial
- actualizaciones localizadas

## 14.5 Presupuestos
- cargar primero resumen principal
- luego detalle por categoría
- luego histórico y ajustes
- formularios claros
- cálculos consistentes

## 14.6 Registro de facturas
- formulario rápido
- selects dependientes
- mostrar impacto presupuestario antes de guardar
- al guardar:
  - feedback inmediato
  - no bloquear por exceso
  - mostrar excedente proyectado si aplica

## 14.7 Listado de facturas
- filtros primero
- tabla después
- paginación obligatoria
- no cargar todo de una vez

## 14.8 Detalle de factura
- datos principales primero
- adjuntos después si existen
- auditoría asociada bajo demanda

## 14.9 Auditoría
- filtros primero
- tabla paginada
- detalle bajo demanda
- no intentar cargar todo el histórico completo

---

# 15. Lineamientos de UI / UX premium

La interfaz debe sentirse:
- premium
- moderna
- ejecutiva
- elegante
- sobria
- muy clara
- rápida

Criterios:
- buena jerarquía visual
- excelente espaciado
- tablas refinadas
- tarjetas KPI premium
- formularios limpios
- alertas elegantes
- estados visuales claros
- responsive real
- excelente experiencia móvil y desktop

No quiero:
- apariencia genérica
- panel viejo
- visual saturado
- exceso de colores
- UX torpe

---

# 16. Modelo de datos esperado

Como mínimo deben existir tablas/modelos equivalentes para:

- users
- roles
- user_roles
- companies
- branches
- user_scope_access
- categories
- subcategories
- budget_periods
- budget_allocations
- budget_adjustments
- vendors
- invoices
- audit_logs
- alerts

Se permite proponer mejoras, pero evitando complejidad innecesaria.

---

# 17. Orden obligatorio de trabajo

## Fase 1
Arquitectura final del MVP

## Fase 2
Schema Prisma completo y consistente

## Fase 3
Autenticación y autorización

## Fase 4
Estructura del proyecto Next.js

## Fase 5
Estrategia de performance, índices y caché

## Fase 6
Diseño visual premium base

## Fase 7
Diseño funcional por módulo:
- dashboard
- empresas
- sucursales
- presupuestos
- facturas
- auditoría

## Fase 8
Roadmap técnico final

## Fase 9
Esperar aprobación explícita

## Fase 10
Comenzar a generar código por bloques

---

# 18. Regla crítica de ejecución

No generes código completo del sistema de una vez.

Cuando llegue el momento de programar, se debe avanzar por bloques en este orden:

1. schema.prisma
2. seed de roles y datos base
3. estructura inicial del proyecto
4. auth
5. middleware y permisos
6. layout base
7. login
8. dashboard base
9. empresas
10. sucursales
11. categorías y subcategorías
12. presupuestos
13. facturas
14. auditoría
15. pulido UX/performance

---

# 19. Lo que debes entregar en cada fase

## En arquitectura
- visión final del sistema
- decisiones clave
- riesgos
- alternativas descartadas

## En schema Prisma
- archivo real
- enums
- relaciones
- índices
- unique constraints
- timestamps
- estados

## En auth
- estrategia
- middleware
- helpers
- control por roles
- control por empresa/sucursal

## En estructura de proyecto
- árbol de carpetas
- criterios
- separación entre dominio, UI y backend

## En performance
- consultas críticas
- índices
- caché
- async por pantalla

## En UX visual
- sistema visual
- layout
- componentes base
- experiencia premium

## En módulos
- pantallas
- flujos
- validaciones
- carga
- async
- caché

## En roadmap
- orden real de implementación
- riesgos
- checklist

---

# 20. Restricciones

- no simplificar el producto a algo genérico
- no cambiar el stack sin justificación fuerte
- no copiar visualmente el Excel
- no generar código antes de tener las fases aprobadas
- no sobreingenierizar
- no sacrificar frontend premium por facilidad
- no sacrificar rendimiento por complejidad visual

---

# 21. Criterios de calidad

Toda propuesta y todo código futuro debe evaluarse con estos criterios:

- coherencia arquitectónica
- consistencia con el MVP
- calidad visual premium
- performance
- seguridad
- mantenibilidad
- escalabilidad
- claridad del modelo de datos
- buena experiencia de usuario

---

# 22. Primera tarea que debe ejecutar la IA al leer este documento

Tu primera tarea es:

1. resumir tu entendimiento del proyecto
2. confirmar el stack definitivo
3. confirmar el orden de trabajo propuesto
4. detectar inconsistencias o preguntas críticas
5. proponer la arquitectura final del MVP

**No generes código todavía.**