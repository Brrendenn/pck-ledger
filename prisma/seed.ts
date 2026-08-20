// prisma/seed.ts
import { PrismaClient } from '@/lib/generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DIRECT_URL || process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.project.deleteMany();

  const project = await prisma.project.create({
    data: {
      name: 'PROJECT PABRIK KONGKIE',
      company: 'PT. PCK',
      sheets: {
        create: [
          { name: 'Kas', type: 'DEBIT_CREDIT' },
          { name: 'Pembukuan Global', type: 'EXPENSE_ONLY' },
          { name: 'Pembukuan Cool Storage', type: 'EXPENSE_ONLY' },
          { name: 'Pembukuan Utility Kongkie', type: 'EXPENSE_ONLY' },
          { name: 'Pembukuan Gardu Listrik', type: 'EXPENSE_ONLY' },
          { name: 'Pembukuan Mess', type: 'EXPENSE_ONLY' },
        ],
      },
    },
    include: {
      sheets: true,
    },
  });

  const kasSheet = project.sheets.find((s) => s.name === 'Kas');

  if (kasSheet) {
    await prisma.transaction.createMany({
      data: [
        {
          sheetId: kasSheet.id,
          date: new Date('2026-08-05'),
          code: 'MT',
          description: 'Material (Oxygen)',
          debit: 0,
          credit: 610500,
        },
        {
          sheetId: kasSheet.id,
          date: new Date('2026-08-06'),
          code: 'MT',
          description: 'Material (Cat Mowilex)',
          debit: 0,
          credit: 744000,
        },
        {
          sheetId: kasSheet.id,
          date: new Date('2026-08-07'),
          code: 'UM',
          description: 'Uang Masuk',
          debit: 20000000,
          credit: 0,
        },
        {
          sheetId: kasSheet.id,
          date: new Date('2026-08-07'),
          code: 'MT',
          description: 'Material (Crona)',
          debit: 0,
          credit: 4639800,
        },
      ],
    });
  }

  console.log(`Seeded project: ${project.name} with sheet Kas ID: ${kasSheet?.id}`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());