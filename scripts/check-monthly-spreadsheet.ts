import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.vercel.production' });

const prisma = new PrismaClient();

async function main() {
  const monthlySpreadsheet = await prisma.monthlyInvoiceSpreadsheet.findUnique({
    where: {
      year_month: { year: 2026, month: 1 }
    }
  });
  console.log('Monthly Spreadsheet:', monthlySpreadsheet);
}

main().finally(() => prisma.$disconnect());
