import * as fs from 'fs';
import * as path from 'path';
import { processCertificate, CertificateData, PublicKeyDetailsRSA, PublicKeyDetailsECDSA } from './utils';

export async function getMapJson(pemDirectory: string) {
    try {
        console.log(`\x1b[34mreading directory: ${pemDirectory}\x1b[0m`);
        const files = fs.readdirSync(pemDirectory);
        console.log(`\x1b[34mfound ${files.length} files\x1b[0m`);

        const certificateMap: { [id: string]: { [issuer: string]: number } } = {};

        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.pem') {
                console.log(`\x1b[90mreading file: ${file}\x1b[0m`);
                const pemFilePath = path.join(pemDirectory, file);
                const pemContent = fs.readFileSync(pemFilePath, 'utf8');
                const certificateData = processCertificate(pemContent, file);
                if (certificateData) {
                    const mapKey = getMapKey(certificateData);

                    if (!certificateMap[mapKey]) {
                        certificateMap[mapKey] = {};
                    }

                    if (!certificateMap[mapKey][certificateData.issuer]) {
                        certificateMap[mapKey][certificateData.issuer] = 0;
                    }

                    certificateMap[mapKey][certificateData.issuer]++;
                }
            }
        }
        return certificateMap;
    } catch (error) {
        console.error('Error:', error);
    }
}

function getMapKey(certificateData: CertificateData): string {
    const { signatureAlgorithm, hashAlgorithm, publicKeyDetails } = certificateData;

    let keyDetails = 'unknown';

    if (publicKeyDetails) {
        if (signatureAlgorithm === "ECDSA") {
            // ECDSA
            keyDetails = (publicKeyDetails as PublicKeyDetailsECDSA).curve;
        } else {
            // RSA
            const keySize = ((publicKeyDetails as PublicKeyDetailsRSA).modulus.length * 4).toString();
            const exponent = (publicKeyDetails as PublicKeyDetailsRSA).exponent;
            keyDetails = `${keySize} bit ${exponent}`;
        }
    }

    return `${hashAlgorithm.toLowerCase()} ${signatureAlgorithm.toLowerCase()} ${keyDetails}`;
}