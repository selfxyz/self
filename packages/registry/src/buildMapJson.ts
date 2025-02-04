import * as fs from 'fs';
import * as path from 'path';
import { argv } from 'process';
import { parseCertificate } from '../../common/src/utils/certificate_parsing/parseCertificate';
import { CertificateData } from '../../common/src/utils/certificate_parsing/dataStructure';

let pemDirectory: string;

const certType = argv[2];

if (certType === 'csca') {
    pemDirectory = path.join(__dirname, '..', 'outputs', 'csca', 'pem_masterlist');
} else if (certType === 'dsc') {
    pemDirectory = path.join(__dirname, '..', 'outputs', 'dsc', 'pem_masterlist');
} else {
    console.error('Invalid certificate type. Use "csca" or "dsc".');
    process.exit(1);
}

async function main() {
    let mapJson: {
        [key: string]: Array<{
            signature_algorithm: string,
            hash_algorithm: string,
            curve_exponent: string,
            bit_length: number,
            amount: number
        }>
    } = {};

    let certificates: { [key: string]: CertificateData } = {};

    try {
        const files = fs.readdirSync(pemDirectory);
        for (const file of files) {
            const pemContent = fs.readFileSync(path.join(pemDirectory, file), 'utf8');
            try {
                const certificate = parseCertificate(pemContent, file);
                if (certificate) {
                    let notAfterDate = new Date(certificate.validity.notAfter);

                    // Add extra validity years based on certificate type
                    if (certType === 'dsc') {
                        notAfterDate.setFullYear(notAfterDate.getFullYear() + 10);
                    } else if (certType === 'csca') {
                        notAfterDate.setFullYear(notAfterDate.getFullYear() + 20);
                    }

                    if (notAfterDate > new Date()) {
                        certificates[certificate.id] = certificate;
                    } else {
                        console.log('\x1b[90m%s\x1b[0m', `certificate ${file} is expired.`);
                    }
                }
            } catch (error) {
                console.log('\x1b[90m%s\x1b[0m', `certificate ${file} is invalid.`);
            }
        }
    } catch (error) {
        console.error('error:', error);
    }

    for (const cert of Object.values(certificates)) {
        const countryCode = cert.issuer;

        // Normalize fields
        const signatureAlgorithm = cert.signatureAlgorithm.toLowerCase().trim();
        const hashAlgorithm = cert.hashAlgorithm.toLowerCase().trim();
        const bits = Number(cert.publicKeyDetails?.bits || 0);

        let curveExponent: string = 'unknown';
        if (cert.publicKeyDetails) {
            if ('exponent' in cert.publicKeyDetails && cert.publicKeyDetails.exponent !== undefined) {
                curveExponent = String(cert.publicKeyDetails.exponent).trim();
            } else if ('curve' in cert.publicKeyDetails && cert.publicKeyDetails.curve !== undefined) {
                curveExponent = cert.publicKeyDetails.curve.toLowerCase().trim();
            }
        }

        // Initialize country array if it doesn't exist
        if (!mapJson[countryCode]) {
            mapJson[countryCode] = [];
        }

        // For debugging: Log the values being compared
        // console.log(`Comparing for country ${countryCode}:`, {
        //     signatureAlgorithm,
        //     hashAlgorithm,
        //     curveExponent,
        //     bits
        // });

        // Find existing entry with matching properties
        const existingEntryIndex = mapJson[countryCode].findIndex(entry =>
            entry.signature_algorithm === signatureAlgorithm &&
            entry.hash_algorithm === hashAlgorithm &&
            entry.curve_exponent === curveExponent &&
            entry.bit_length === bits
        );

        if (existingEntryIndex !== -1) {
            // If found, increment the amount
            mapJson[countryCode][existingEntryIndex].amount += 1;
        } else {
            // If not found, add new entry with amount 1
            mapJson[countryCode].push({
                signature_algorithm: signatureAlgorithm,
                hash_algorithm: hashAlgorithm,
                curve_exponent: curveExponent,
                bit_length: bits,
                amount: 1
            });
        }
    }

    fs.writeFileSync(
        path.join(__dirname, '..', 'outputs', certType, 'map_json.json'),
        JSON.stringify(mapJson, null, 2)
    );
}

main();
