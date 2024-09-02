import * as fs from 'fs';
import * as path from 'path';
import { processCertificate } from './utils/utils';
import { argv } from 'process';
import { getPrismaClientFromEnv, insertDB } from './utils/prisma';

// Modify the pemDirectory and tableName declarations
let pemDirectory: string;
let tableName: 'csca_masterlist' | 'dsc_masterlist';

// Parse command-line argument
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

async function main() {
    try {
        const prisma = getPrismaClientFromEnv();
        console.log(`Reading directory: ${pemDirectory}`);
        const files = fs.readdirSync(pemDirectory);
        console.log(`Found ${files.length} files`);

        const processedCertificates = new Set<string>();

        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.pem') {
                console.log(`Processing file: ${file}`);
                const pemFilePath = path.join(pemDirectory, file);
                const pemContent = fs.readFileSync(pemFilePath, 'utf8');
                const certificateData = processCertificate(pemContent, file);
                if (certificateData && certificateData.id) {
                    console.log(`Inserting certificate: ${certificateData.id}`);
                    if (processedCertificates.has(certificateData.id)) {
                        console.log(`Certificate with ID ${certificateData.id} has already been processed. Skipping.`);
                        continue;
                    }
                    insertDB(prisma, tableName, certificateData);
                    processedCertificates.add(certificateData.id);

                }
            }
        }
    } catch (error) {
        console.error('Error in main:', error);
    }
}
console.log('Script started');
main();
