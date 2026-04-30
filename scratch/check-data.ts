import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const budgets = await prisma.budget.findMany({
    include: {
      allocations: true,
      branch: { include: { company: true } }
    }
  })

  console.log('--- RESUMEN DE DATOS ---')
  console.log(`Total Presupuestos: ${budgets.length}`)
  
  budgets.forEach(b => {
    console.log(`- Presupuesto: ${b.name} (${b.branch.company.name} / ${b.branch.name})`)
    console.log(`  Asignaciones (Categorías): ${b.allocations.length}`)
    b.allocations.forEach(a => {
      console.log(`    * ID: ${a.id}`)
    })
  })

  const users = await prisma.user.findMany({
    select: { name: true, role: true, companyId: true }
  })
  console.log('\n--- USUARIOS ---')
  users.forEach(u => {
    console.log(`- ${u.name} (${u.role}) | CompanyId: ${u.companyId}`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
