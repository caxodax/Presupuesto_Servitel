# Presupuesto Servitel

Sistema de control presupuestario multiempresa basado en Next.js y Supabase.

## Requisitos
- Node.js 20+
- Cuenta en Supabase (o instancia local de Supabase)

## Configuración Inicial

1. **Variables de entorno**:
   Copia `.env.example` a `.env.local` y configura las siguientes variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Opcional, para scripts de administración)

2. **Base de Datos**:
   Ejecuta los siguientes scripts en el SQL Editor de Supabase en este orden:
   1. `supabase_db_setup.sql` (Crea tablas, enums, índices y funciones)
   2. `supabase/rls_policies.sql` (Configura políticas de seguridad RLS)
   3. `supabase/audit_triggers.sql` (Configura triggers de auditoría)

## Desarrollo

```bash
npm install
npm run dev
```

## Build para Producción

```bash
npm run build
```

## Estructura del Proyecto
- `/src/app`: Rutas y páginas de Next.js (App Router)
- `/src/components`: Componentes de UI (Radix UI + Tailwind)
- `/src/features`: Lógica de negocio organizada por dominios (actions, queries, hooks)
- `/src/lib`: Clientes de base de datos y utilidades generales
- `/src/types`: Definiciones de TypeScript

## Seguridad
El proyecto utiliza **Row Level Security (RLS)** de Supabase para garantizar el aislamiento multiempresa. Cada usuario solo puede acceder a los datos de su propia empresa (salvo el rol `SUPER_ADMIN`).
