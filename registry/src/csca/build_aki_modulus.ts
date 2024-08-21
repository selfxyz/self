import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { DEVELOPMENT_MODE } from '../../../common/src/constants/constants';
import jsrsasign from 'jsrsasign';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);

// Paths
const pathToPemFiles = "outputs/unique_pem";
const pathToJsonOutput = "outputs/csca_ski_modulus.json";

function isRsaPublicKey(key) {
    return key.type === 'RSA';
}

async function buildAkiModulusMap() {
    const skiToModulus: { [key: string]: string[] } = {};

    const validAlgorithms = [
        "SHA256withRSAandMGF1",
        "SHA256withRSA",
        "rsaPSS",
        "SHA1withRSA"
    ];

    const processCertificate = (certificate, filePath) => {
        const signatureAlgorithm = certificate.getSignatureAlgorithmField();
        console.log(`Reading file ${filePath}`);

        if (!validAlgorithms.includes(signatureAlgorithm)) {
            console.log(`Skipping file ${filePath}: Unsupported signature algorithm ${signatureAlgorithm}`);
            return;
        }

        const publicKey = jsrsasign.KEYUTIL.getKey(certificate.getPublicKey());

        if (!isRsaPublicKey(publicKey)) {
            console.log(`Skipping file ${filePath}: Not an RSA key`);
            return;
        }

        const keyLength = publicKey.n.bitLength();
        if (keyLength > 4096) {
            console.log(`Skipping file ${filePath}: Key length ${keyLength} bits exceeds 4096 bits`);
            return;
        }
        const modulus = publicKey.n.toString(16).padStart(512, '0');
        const formattedModulus = modulus.match(/.{1,2}/g)?.join(':') || '';
        const skiValue = certificate.getExtSubjectKeyIdentifier();
        console.log(formattedModulus);

        if (modulus && skiValue) {
            let skiHex = typeof skiValue === 'string' ? skiValue : jsrsasign.hextob64(skiValue);
            if (!skiHex) {
                console.log(`Skipping file ${filePath}: SKI extraction failed`);
                return;
            }

            // Remove "0414" prefix if present
            skiHex = skiHex.replace(/^0414/, '');

            skiToModulus[skiHex] = formattedModulus;
            console.log(`Processed ${filePath}: SKI ${skiHex}, Key Length ${keyLength} bits`);
        } else {
            console.log(`Skipping file ${filePath}: Missing modulus or SKI`);
        }
    };

    const files = await readdir(pathToPemFiles);
    for (const file of files) {
        if (file.endsWith(".pem")) {
            const filePath = path.join(pathToPemFiles, file);
            const fileContent = await readFile(filePath, 'utf8');

            try {
                const certificate = new jsrsasign.X509();
                certificate.readCertPEM(fileContent);
                processCertificate(certificate, filePath);
            } catch (error) {
                console.error(`Error processing file ${file}:`, error);
            }
        }
    }

    if (DEVELOPMENT_MODE) {
        const mockCscaList = [
            '../common/src/mock_certificates/sha256_rsa_4096/mock_csca.crt',
            '../common/src/mock_certificates/sha256_rsa_2048/mock_csca.crt',
        ];

        for (const mockCscaFile of mockCscaList) {
            try {
                const certPem = await readFile(mockCscaFile, 'utf8');
                const certificate = new jsrsasign.X509();
                certificate.readCertPEM(certPem);
                processCertificate(certificate, mockCscaFile);
            } catch (error) {
                console.error(`Error processing mock file ${mockCscaFile}:`, error);
            }
        }
    }

    await writeFile(pathToJsonOutput, JSON.stringify(skiToModulus, null, 4));
    console.log(`AKI to modulus map written to ${pathToJsonOutput}`);
}

buildAkiModulusMap().catch(error => console.error(error));