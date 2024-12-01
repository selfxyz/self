import * as fs from 'fs';
import * as path from 'path';
import { argv } from 'process';
import { getPrismaClientFromEnv, prepareDataForInsertion } from './utils/prisma';
import { parseCertificate } from './utils/certificateParsing/parseCertificate';
import { CertificateData } from './utils/certificateParsing/dataStructure';

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



async function main() {
    let mapJson: { [key: string]: { [key: string]: number } } = {};
    let certificates: { [key: string]: CertificateData } = {};
    try {
        const files = fs.readdirSync(pemDirectory);
        for (const file of files) {
            const pemContent = fs.readFileSync(path.join(pemDirectory, file), 'utf8');
            try {
                const certificate = parseCertificate(pemContent, file);
                if (certificate) {
                    const notAfterDate = new Date(certificate.validity.notAfter);
                    if (notAfterDate > new Date()) {
                        certificates[certificate.id] = certificate;
                    } else {
                        console.log('\x1b[90m%s\x1b[0m', `certificate ${file} is expired.`);
                    }
                }
            }
            catch (error) {
                console.log('\x1b[90m%s\x1b[0m', `certificate ${file} is invalid.`);
            }

        }
    } catch (error) {
        console.error('error:', error);
    }
    for (const cert of Object.values(certificates)) {
        const issuer = cert.issuer;
        const signatureAlgorithm = cert.signatureAlgorithm;
        const hashAlgorithm = cert.hashAlgorithm;
        const bits = cert.publicKeyDetails?.bits || 'unknown';

        const pubKeyType = cert.publicKeyDetails
            ? ('exponent' in cert.publicKeyDetails ? cert.publicKeyDetails.exponent : cert.publicKeyDetails.curve)
            : 'unknown';

        const certDescription = `${signatureAlgorithm} ${hashAlgorithm} ${bits} ${pubKeyType}`;

        if (!mapJson[certDescription]) {
            mapJson[certDescription] = {};
        }
        if (!mapJson[certDescription][issuer]) {
            mapJson[certDescription][issuer] = 0;
        }

        mapJson[certDescription][issuer]++;
    }
    fs.writeFileSync(path.join(__dirname, '..', 'outputs', certType, 'map_json.json'), JSON.stringify(mapJson, null, 2));
}
main();
