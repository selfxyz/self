import * as fs from 'fs';
import * as path from 'path';
import { processCertificate } from './utils';

const pemDirectory = path.join(__dirname, '..', '..', 'outputs', 'unique_pem_masterlist');

async function main() {
    try {
        console.log('Database initialized');

        console.log(`Reading directory: ${pemDirectory}`);
        const files = fs.readdirSync(pemDirectory);
        console.log(`Found ${files.length} files`);

        const certificateMap: { [id: string]: any } = {};

        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.pem') {
                console.log(`Processing file: ${file}`);
                const pemFilePath = path.join(pemDirectory, file);
                const pemContent = fs.readFileSync(pemFilePath, 'utf8');
                const certificateData = processCertificate(pemContent, file);
                if (certificateData && certificateData.id) {
                    certificateMap[certificateData.id] = certificateData;
                }
            }
        }

        console.log('Certificate Map:', JSON.stringify(certificateMap, null, 2));

        // Optionally, you can write the map to a file
        fs.writeFileSync('certificateMap.json', JSON.stringify(certificateMap, null, 2));
        console.log('Certificate map has been written to certificateMap.json');
    } catch (error) {
        console.error('Error in main:', error);
    }
}

console.log('Script started');
main();