import * as fs from 'fs';
import * as path from 'path';
import { processCertificate } from './utils';


export async function getRegistryJson(pemDirectory: string) {
    try {
        console.log(`\x1b[34mreading directory: ${pemDirectory}\x1b[0m`);
        const files = fs.readdirSync(pemDirectory);
        console.log(`\x1b[34mfound ${files.length} files\x1b[0m`);

        const certificateMap: { [id: string]: any } = {};

        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.pem') {
                console.log(`\x1b[90mreading file: ${file}\x1b[0m`);
                const pemFilePath = path.join(pemDirectory, file);
                const pemContent = fs.readFileSync(pemFilePath, 'utf8');
                const certificateData = processCertificate(pemContent, file);
                if (certificateData && certificateData.id) {
                    certificateMap[certificateData.id] = certificateData;
                }
            }
        }

        // Optionally, you can write the map to a file
        // fs.writeFileSync('certificateMap.json', JSON.stringify(certificateMap, null, 2));
        // console.log('Certificate map has been written to certificateMap.json');
        return certificateMap;
    } catch (error) {
        console.error('Error:', error);
    }
}
