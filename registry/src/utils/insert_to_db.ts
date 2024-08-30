import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { processCertificate, CertificateData, PublicKeyDetailsRSA, PublicKeyDetailsECDSA } from './utils';

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if DATABASE_URL is set
if (!process.env.POSTGRES_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    datasourceUrl: process.env.POSTGRES_URL + '?connection_limit=20&pool_timeout=30',
});

export default prisma;

const pemDirectory = path.join(__dirname, '..', '..', 'outputs', 'unique_pem_masterlist');

function publicKeyDetailsToJson(details: PublicKeyDetailsRSA | PublicKeyDetailsECDSA | undefined): any {
    if (!details) return null;
    if ('modulus' in details) {
        return {
            type: 'RSA',
            modulus: details.modulus,
            exponent: details.exponent,
        };
    } else {
        return {
            type: 'ECDSA',
            curve: details.curve,
            params: details.params,
        };
    }
}

// Create a Set to keep track of processed certificate IDs
const processedCertificates = new Set<string>();

export async function insertDB(certificateData: CertificateData) {
    try {
        // Check if the certificate has already been processed
        if (processedCertificates.has(certificateData.id)) {
            console.log(`Certificate with ID ${certificateData.id} has already been processed. Skipping.`);
            return;
        }

        const result = await prisma.certificatesjs.upsert({
            where: { id: certificateData.id },
            update: {
                // Overwrite all fields with new data
                issuer: certificateData.issuer,
                validity: certificateData.validity,
                subjectKeyIdentifier: certificateData.subjectKeyIdentifier,
                signatureAlgorithm: certificateData.signatureAlgorithm,
                hashAlgorithm: certificateData.hashAlgorithm,
                publicKeyDetails: publicKeyDetailsToJson(certificateData.publicKeyDetails),
                rawPem: certificateData.rawPem,
                rawTxt: certificateData.rawTxt,
            },
            create: {
                id: certificateData.id,
                issuer: certificateData.issuer,
                validity: certificateData.validity,
                subjectKeyIdentifier: certificateData.subjectKeyIdentifier,
                signatureAlgorithm: certificateData.signatureAlgorithm,
                hashAlgorithm: certificateData.hashAlgorithm,
                publicKeyDetails: publicKeyDetailsToJson(certificateData.publicKeyDetails),
                rawPem: certificateData.rawPem,
                rawTxt: certificateData.rawTxt,
            },
        });

        // Add the certificate ID to the processed set
        processedCertificates.add(certificateData.id);

        console.log(`Certificate with ID ${certificateData.id} has been upserted.`);
        return result;
    } catch (error) {
        console.error('Error inserting certificate:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log(`Reading directory: ${pemDirectory}`);
        const files = fs.readdirSync(pemDirectory);
        console.log(`Found ${files.length} files`);
        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.pem') {
                console.log(`Processing file: ${file}`);
                const pemFilePath = path.join(pemDirectory, file);
                const pemContent = fs.readFileSync(pemFilePath, 'utf8');
                const certificateData = processCertificate(pemContent, file);
                if (certificateData && certificateData.id) {
                    console.log(`Inserting certificate: ${certificateData.id}`);
                    insertDB(await certificateData);
                }
                //Insert certificates into the database
            }
        }
    } catch (error) {
        console.error('Error in main:', error);
    }
}
console.log('Script started');
main();