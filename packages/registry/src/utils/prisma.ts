import { PrismaClient } from '@prisma/client';
import { CertificateData, PublicKeyDetailsRSA, PublicKeyDetailsECDSA, PublicKeyDetailsRSAPSS } from './certificateParsing/dataStructure';
import dotenv from 'dotenv';

// Load environment variables

export const getPrismaClientFromEnv = () => {

    dotenv.config();

    // Check if DATABASE_URL is set
    if (!process.env.POSTGRES_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
    }

    const prisma = new PrismaClient({
        datasourceUrl: process.env.POSTGRES_URL + '?connection_limit=20&pool_timeout=30',
    });

    return prisma;
}


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


export async function insertDB(prisma: PrismaClient, tableName: 'csca_masterlist' | 'dsc_masterlist', data: CertificateData) {
    // Create a properly formatted data object for Prisma
    const flattenedData = {
        id: data.id,
        issuer: data.issuer,
        hashAlgorithm: data.hashAlgorithm,
        signatureAlgorithm: data.signatureAlgorithm,
        // Convert JSON objects to strings
        validity: JSON.stringify(data.validity),
        publicKeyDetails: JSON.stringify(data.publicKeyDetails),
        subjectKeyIdentifier: data.subjectKeyIdentifier,
        rawPem: data.rawPem,
        rawTxt: data.rawTxt,

        // Flattened fields from publicKeyDetails
        pk_modulus: data.publicKeyDetails?.['modulus']?.toString() || null,
        pk_exponent: data.publicKeyDetails?.['exponent']?.toString() || null,
        pk_bits: data.publicKeyDetails?.['bits']?.toString() || null,
        pk_curve: (data.publicKeyDetails as PublicKeyDetailsECDSA)?.['curve']?.toString() || null,
        pk_hashAlgorithm: (data.publicKeyDetails as PublicKeyDetailsRSAPSS)?.['hashAlgorithm']?.toString() || null,
        pk_mgf: (data.publicKeyDetails as PublicKeyDetailsRSAPSS)?.['mgf']?.toString() || null,
        pk_saltLength: (data.publicKeyDetails as PublicKeyDetailsRSAPSS)?.['saltLength']?.toString() || null,
    };

    try {
        if (tableName === 'csca_masterlist') {
            await prisma.csca_masterlist.upsert({
                where: { id: data.id },
                update: flattenedData,
                create: flattenedData,
            });
        } else {
            await prisma.dsc_masterlist.upsert({
                where: { id: data.id },
                update: flattenedData,
                create: flattenedData,
            });
        }
    } catch (error) {
        console.error('Error inserting data:', error);
        throw error;
    }
}
// registry/src/utils/prisma.ts
export function prepareDataForInsertion(data: CertificateData) {
    // Flatten the data as before
    const flattenedData = {
        id: data.id,
        issuer: data.issuer,
        hashAlgorithm: data.hashAlgorithm,
        signatureAlgorithm: data.signatureAlgorithm,
        validity: data.validity, // Assuming validity is serialized as JSON string
        publicKeyDetails: data.publicKeyDetails, // Assuming this is serialized as JSON string
        subjectKeyIdentifier: data.subjectKeyIdentifier,
        rawPem: data.rawPem,
        rawTxt: data.rawTxt,
        pk_modulus: data.publicKeyDetails?.['modulus']?.toString() || null,
        pk_exponent: data.publicKeyDetails?.['exponent']?.toString() || null,
        pk_bits: data.publicKeyDetails?.['bits']?.toString() || null,
        pk_curve: (data.publicKeyDetails as PublicKeyDetailsECDSA)?.['curve']?.toString() || null,
        pk_hashAlgorithm: (data.publicKeyDetails as PublicKeyDetailsRSAPSS)?.['hashAlgorithm']?.toString() || null,
        pk_mgf: (data.publicKeyDetails as PublicKeyDetailsRSAPSS)?.['mgf']?.toString() || null,
        pk_saltLength: (data.publicKeyDetails as PublicKeyDetailsRSAPSS)?.['saltLength']?.toString() || null,
    };

    return flattenedData;
}