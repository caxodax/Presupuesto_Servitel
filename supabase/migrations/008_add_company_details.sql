-- Añadir columnas de detalles corporativos a la tabla Company
ALTER TABLE "Company" 
ADD COLUMN IF NOT EXISTS "taxId" TEXT,
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT DEFAULT 'USD';
