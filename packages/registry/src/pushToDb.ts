import * as fs from 'fs';
import * as path from 'path';
import { argv } from 'process';
import { getPrismaClientFromEnv, prepareDataForInsertion } from './utils/prisma';
import { parseCertificate } from '../../common/src/utils/certificate_parsing/parseCertificate';

let pemDirectory: string;
let tableName: 'csca_masterlist' | 'dsc_masterlist';

const certType = argv[2];

if (certType === 'csca') {
    pemDirectory = path.join(__dirname, '..', 'outputs', 'csca', 'pem_masterlist');
    tableName = 'csca_masterlist';
} else if (certType === 'dsc') {
    pemDirectory = path.join(__dirname, '..', 'outputs', 'dsc', 'pem_masterlist');
    tableName = 'dsc_masterlist';
} else {
    console.error('Invalid certificate type. Use "csca" or "dsc".');
    process.exit(1);
}

async function processBatch(files: string[], prisma: any, startIdx: number, batchSize: number) {
    const endIdx = Math.min(startIdx + batchSize, files.length);
    const batchData = [];

    for (let i = startIdx; i < endIdx; i++) {
        const file = files[i];
        if (path.extname(file).toLowerCase() === '.pem') {
            try {
                const pemFilePath = path.join(pemDirectory, file);
                const pemContent = fs.readFileSync(pemFilePath, 'utf8');
                const certificateData = parseCertificate(pemContent, file);

                if (certificateData && certificateData.id) {
                    let notAfterDate = new Date(certificateData.validity.notAfter);

                    // Add extra validity years based on certificate type
                    if (certType === 'dsc') {
                        notAfterDate.setFullYear(notAfterDate.getFullYear() + 10);
                    } else if (certType === 'csca') {
                        notAfterDate.setFullYear(notAfterDate.getFullYear() + 20);
                    }

                    if (notAfterDate > new Date()) {
                        batchData.push(prepareDataForInsertion(certificateData));
                    } else {
                        console.log('\x1b[90m%s\x1b[0m', `certificate ${file} is expired.`);
                    }
                }
            } catch (error) {
                console.error(`Error processing file ${file}:`, error);
            }
        }
    }

    if (batchData.length > 0) {
        try {
            if (tableName === 'csca_masterlist') {
                await prisma.csca_masterlist.createMany({
                    data: batchData,
                    skipDuplicates: true,
                });
            } else {
                await prisma.dsc_masterlist.createMany({
                    data: batchData,
                    skipDuplicates: true,
                });
            }
            console.log(`Successfully processed batch ${startIdx + 1}-${endIdx} (${batchData.length} certificates)`);
        } catch (error) {
            console.error(`Error inserting batch ${startIdx + 1}-${endIdx}:`, error);
        }
    }
}

async function main() {
    try {
        const prisma = getPrismaClientFromEnv();
        console.log(`Reading directory: ${pemDirectory}`);
        const files = fs.readdirSync(pemDirectory);
        const totalFiles = files.length;
        console.log(`Found ${totalFiles} files`);

        const BATCH_SIZE = 1000; // Adjust as needed
        const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);

        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
            console.log(`Processing batch ${currentBatch}/${totalBatches} (${Math.min(BATCH_SIZE, totalFiles - i)} files)`);

            await processBatch(files, prisma, i, BATCH_SIZE);

            // Optional: Delay between batches
            // await new Promise(resolve => setTimeout(resolve, 100));

            // Log progress
            const progress = ((i + BATCH_SIZE) / totalFiles * 100).toFixed(2);
            console.log(`Progress: ${progress}%`);
        }

        await prisma.$disconnect();
        console.log('Processing completed successfully');
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}

console.log('Script started');
main().catch(console.error);
