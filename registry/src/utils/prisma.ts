import { PrismaClient } from '@prisma/client';
import { CertificateData, PublicKeyDetailsRSA, PublicKeyDetailsECDSA } from './utils';
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


export async function insertDB(prisma: PrismaClient, tableName: 'csca_masterlist' | 'dsc_masterlist', certificateData: CertificateData) {
    try {

        const result = await (prisma[tableName] as any).upsert({
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

        console.log(`Certificate with ID ${certificateData.id} has been upserted.`);
        return result;
    } catch (error) {
        console.error('Error inserting certificate:', error);
        throw error;
    }
}
