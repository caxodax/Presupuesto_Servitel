# Presupuestos App

Proyecto Next.js + Prisma + PostgreSQL para control presupuestario multiempresa.

## Requisitos
- Node.js 20+
- PostgreSQL 14+

## Variables de entorno
Copia `.env.example` a `.env` y ajusta `DATABASE_URL`, `AUTH_SECRET` y `NEXTAUTH_URL`.

## Instalación
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

## Accesos demo
- Super admin: `admin@empresa.com` / `admin123`
- Admin empresa: `empresa@demo.com` / `empresa123`

## Rutas principales
- `/login`
- `/dashboard`
- `/dashboard/empresas`
- `/dashboard/sucursales`
- `/dashboard/categorias`
- `/dashboard/presupuestos`
- `/dashboard/facturas`
- `/dashboard/auditoria`
