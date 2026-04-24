import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() { 
  const c1 = await p.category.create({ 
    data: { name: 'Mantenimiento Preventivo', companyId: 'cmnmdt59u00091446sq2sun0b' } 
  });
  const c2 = await p.category.create({ 
    data: { name: 'Gastos Administrativos', companyId: 'cmnmdt59u00091446sq2sun0b' } 
  });
  
  await p.budgetAllocation.create({ 
    data: { 
        budgetId: 'cmnvygup20003ino3x827zy4p', 
        categoryId: c1.id, 
        amountUSD: 2500, 
        consumedUSD: 0, 
        consumedVES: 0 
    } 
  });
  
  await p.budgetAllocation.create({ 
    data: { 
        budgetId: 'cmnvygup20003ino3x827zy4p', 
        categoryId: c2.id, 
        amountUSD: 2500, 
        consumedUSD: 0, 
        consumedVES: 0 
    } 
  });
  
  console.log('Asignaciones de prueba creadas exitosamente para Cablenet');
} 

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await p.$disconnect()
  })
