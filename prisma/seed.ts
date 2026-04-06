import { PrismaClient, Role, BudgetPeriodType, BudgetStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Inicializando seed...");
  const passwordHash = await bcrypt.hash("admin123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@empresa.com" },
    update: { passwordHash, name: "Super Admin General", role: Role.SUPER_ADMIN, isActive: true },
    create: { email: "admin@empresa.com", name: "Super Admin General", passwordHash, role: Role.SUPER_ADMIN },
  });

  const company = await prisma.company.upsert({
    where: { id: "demo-company" },
    update: { name: "Empresa Demo", isActive: true },
    create: { id: "demo-company", name: "Empresa Demo", isActive: true },
  });

  const branch = await prisma.branch.upsert({
    where: { id: "demo-branch" },
    update: { name: "Sucursal Principal", companyId: company.id, isActive: true },
    create: { id: "demo-branch", name: "Sucursal Principal", companyId: company.id, isActive: true },
  });

  const adminEmpresaPwd = await bcrypt.hash("empresa123", 10);
  await prisma.user.upsert({
    where: { email: "empresa@demo.com" },
    update: { name: "Admin Empresa Demo", passwordHash: adminEmpresaPwd, role: Role.COMPANY_ADMIN, companyId: company.id, branchId: branch.id },
    create: { email: "empresa@demo.com", name: "Admin Empresa Demo", passwordHash: adminEmpresaPwd, role: Role.COMPANY_ADMIN, companyId: company.id, branchId: branch.id },
  });

  const catInternet = await prisma.category.upsert({
    where: { name_companyId: { name: "Internet", companyId: company.id } },
    update: {},
    create: { name: "Internet", companyId: company.id },
  });

  const catOperaciones = await prisma.category.upsert({
    where: { name_companyId: { name: "Operaciones", companyId: company.id } },
    update: {},
    create: { name: "Operaciones", companyId: company.id },
  });

  const subMantenimiento = await prisma.subcategory.upsert({
    where: { name_categoryId: { name: "Mantenimiento", categoryId: catOperaciones.id } },
    update: {},
    create: { name: "Mantenimiento", categoryId: catOperaciones.id },
  });

  const budget = await prisma.budget.upsert({
    where: { id: "demo-budget" },
    update: {
      name: "Abril 2026 - Sucursal Principal",
      companyId: company.id,
      branchId: branch.id,
      initialDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-30T23:59:59.999Z"),
      amountLimitUSD: 5000,
      type: BudgetPeriodType.MONTHLY,
      status: BudgetStatus.ACTIVE,
    },
    create: {
      id: "demo-budget",
      name: "Abril 2026 - Sucursal Principal",
      companyId: company.id,
      branchId: branch.id,
      initialDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-30T23:59:59.999Z"),
      amountLimitUSD: 5000,
      type: BudgetPeriodType.MONTHLY,
      status: BudgetStatus.ACTIVE,
    },
  });

  const allocInternet = await prisma.budgetAllocation.upsert({
    where: { budgetId_categoryId_subcategoryId: { budgetId: budget.id, categoryId: catInternet.id, subcategoryId: null } },
    update: { amountUSD: 2000, consumedUSD: 0 },
    create: { budgetId: budget.id, categoryId: catInternet.id, amountUSD: 2000, amountVES: 0 },
  });

  await prisma.budgetAllocation.upsert({
    where: { budgetId_categoryId_subcategoryId: { budgetId: budget.id, categoryId: catOperaciones.id, subcategoryId: subMantenimiento.id } },
    update: { amountUSD: 1500, consumedUSD: 0 },
    create: { budgetId: budget.id, categoryId: catOperaciones.id, subcategoryId: subMantenimiento.id, amountUSD: 1500, amountVES: 0 },
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: superAdmin.id,
      action: "SEED_BOOTSTRAP",
      entity: "Sistema",
      entityId: company.id,
      details: { message: "Datos demo iniciales creados." },
    },
  }).catch(() => undefined);

  console.log("✅ Seed completado");
  console.log("Super admin: admin@empresa.com / admin123");
  console.log("Admin empresa: empresa@demo.com / empresa123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
