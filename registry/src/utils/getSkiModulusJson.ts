import * as fs from 'fs';
import * as path from 'path';
import { processCertificate } from './utils';

export async function getSkiModulusJson(pemDirectory: string) {
    try {
        console.log(`\x1b[34mreading directory: ${pemDirectory}\x1b[0m`);
        const files = fs.readdirSync(pemDirectory);
        console.log(`\x1b[34mfound ${files.length} files\x1b[0m`);

        const skiModulusMap: { [ski: string]: string } = {};

        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.pem') {
                console.log(`\x1b[90mreading file: ${file}\x1b[0m`);
                const pemFilePath = path.join(pemDirectory, file);
                const pemContent = fs.readFileSync(pemFilePath, 'utf8');
                const certificateData = processCertificate(pemContent, file);
                if (certificateData && certificateData.subjectKeyIdentifier && certificateData.publicKeyDetails) {
                    if ('modulus' in certificateData.publicKeyDetails) {
                        skiModulusMap[certificateData.subjectKeyIdentifier] = certificateData.publicKeyDetails.modulus;
                    }
                }
            }
        }

        return skiModulusMap;
    } catch (error) {
        console.error('Error:', error);
        return {};
    }
}
