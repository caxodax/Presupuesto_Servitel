# Probar en local

## 1. Requisitos
- Node.js 20 o superior
- PostgreSQL 14 o superior

## 2. Crear base de datos
Crea una base llamada `presupuesto`.

Ejemplo en psql:

```sql
CREATE DATABASE presupuesto;
```

## 3. Variables de entorno
Usa el archivo `.env` incluido o copia `.env.example` a `.env`.

Valor esperado por defecto:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/presupuesto?schema=public"
AUTH_SECRET="A3Xq1V8+p0LmNcYbG7Df9RtWk2Hzv5JuO4E1PqRsTxY="
NEXTAUTH_URL="http://localhost:3000"
```

## 4. Instalar dependencias
```bash
npm install
```

## 5. Generar cliente Prisma
```bash
npx prisma generate
```

## 6. Crear tablas
```bash
npx prisma migrate dev --name init
```

Si prefieres no crear migración local, puedes usar:

```bash
npx prisma db push
```

## 7. Cargar datos demo
```bash
npm run db:seed
```

## 8. Levantar la app
```bash
npm run dev
```

## 9. Abrir en navegador
- http://localhost:3000
- la app redirige a `/login`

## 10. Usuarios demo
- Super admin: `admin@empresa.com` / `admin123`
- Admin empresa: `empresa@demo.com` / `empresa123`

## 11. Rutas
- `/dashboard`
- `/dashboard/empresas`
- `/dashboard/sucursales`
- `/dashboard/categorias`
- `/dashboard/presupuestos`
- `/dashboard/facturas`
- `/dashboard/auditoria`

## 12. Qué probar primero
1. entrar con `empresa@demo.com`
2. revisar dashboard
3. revisar categorías
4. revisar presupuestos
5. registrar una factura
6. ver el detalle de la factura
7. revisar auditoría

## 13. Cuándo subir a Vercel
No lo subas a Vercel antes de verificar esto en local:
- login funciona
- dashboard abre
- seed cargó bien
- se puede crear presupuesto
- se puede registrar factura
- auditoría muestra datos
