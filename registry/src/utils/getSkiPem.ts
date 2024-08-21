import * as fs from 'fs';
import * as path from 'path';
import { processCertificate } from './utils';
import { mock_csca_sha1_rsa_4096, mock_csca_sha256_rsa_4096 } from '../../../common/src/constants/mockCertificates';

export async function getSkiPemJson(pemDirectory: string) {
    try {
        console.log(`\x1b[34mreading directory: ${pemDirectory}\x1b[0m`);
        const files = fs.readdirSync(pemDirectory);
        console.log(`\x1b[34mfound ${files.length} files\x1b[0m`);

        const skiPemMap: { [ski: string]: string } = {};

        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.pem') {
                console.log(`\x1b[90mreading file: ${file}\x1b[0m`);
                const pemFilePath = path.join(pemDirectory, file);
                const pemContent = fs.readFileSync(pemFilePath, 'utf8');
                const certificateData = processCertificate(pemContent, file);
                if (certificateData && certificateData.rawPem) {
                    skiPemMap[certificateData.subjectKeyIdentifier] = certificateData.rawPem;
                }
            }
        }

        return skiPemMap;
    } catch (error) {
        console.error('Error:', error);
        return {};
    }
}


export async function getSkiPemDevJson() {

    try {
        const files = [mock_csca_sha1_rsa_4096, mock_csca_sha256_rsa_4096];

        const skiPemMap: { [ski: string]: string } = {};

        for (const file of files) {

            console.log(`\x1b[90mreading file: ${file}\x1b[0m`);
            const certificateData = processCertificate(file, files.indexOf(file).toString());
            if (certificateData && certificateData.rawPem) {
                skiPemMap[certificateData.subjectKeyIdentifier] = certificateData.rawPem;
            }
        }

        return skiPemMap;
    } catch (error) {
        console.error('Error:', error);
        return {};
    }
}