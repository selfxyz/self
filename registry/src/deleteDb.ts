// Create a script like clearDscTable.ts
import { getPrismaClientFromEnv } from './utils/prisma';

async function clearDscTable() {
    const prisma = getPrismaClientFromEnv();
    try {
        await prisma.dsc_masterlist.deleteMany({});
        await prisma.csca_masterlist.deleteMany({});
        console.log('Successfully cleared dsc_masterlist and csca_masterlist tables');
    } catch (error) {
        console.error('Error clearing table:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearDscTable();