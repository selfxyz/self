import * as asn1 from 'asn1js';
import { Certificate } from 'pkijs';
import { vkey_prove_rsa_65537_sha256 } from '../constants/vkey';

export const getSignatureAlgorithm = (pemContent: string) => {
    const certBuffer = Buffer.from(pemContent.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''), 'base64');
    const asn1Data = asn1.fromBER(certBuffer);
    const cert = new Certificate({ schema: asn1Data.result });
    const signatureAlgorithmOid = cert.signatureAlgorithm.algorithmId;
    const { signatureAlgorithm, hashFunction } = getSignatureAlgorithmDetails(signatureAlgorithmOid);
    return { signatureAlgorithm, hashFunction };
}

export const getCircuitName = (circuitType: string, signatureAlgorithm: string, hashFunction: string) => {
    if (signatureAlgorithm === 'ecdsa') {
        return circuitType + "_" + signatureAlgorithm + "_" + hashFunction;
    }
    else {
        return circuitType + "_" + signatureAlgorithm + "_65537_" + hashFunction;
    }
}

export function getSignatureAlgorithmDetails(oid: string): { signatureAlgorithm: string, hashFunction: string } {
    const details = {
        '1.2.840.113549.1.1.5': { signatureAlgorithm: 'rsa', hashFunction: 'sha1' },
        '1.2.840.113549.1.1.11': { signatureAlgorithm: 'rsa', hashFunction: 'sha256' },
        '1.2.840.113549.1.1.12': { signatureAlgorithm: 'rsa', hashFunction: 'sha384' },
        '1.2.840.113549.1.1.13': { signatureAlgorithm: 'rsa', hashFunction: 'sha512' },
        // rsapss
        '1.2.840.113549.1.1.10': { signatureAlgorithm: 'rsapss', hashFunction: 'sha256' }, // TODO: detect which hash function is used (not always sha256)
        // ecdsa
        '1.2.840.10045.4.1': { signatureAlgorithm: 'ecdsa', hashFunction: 'sha1' },
        '1.2.840.10045.4.3.1': { signatureAlgorithm: 'ecdsa', hashFunction: 'sha224' },
        '1.2.840.10045.4.3.2': { signatureAlgorithm: 'ecdsa', hashFunction: 'sha256' },
        '1.2.840.10045.4.3.3': { signatureAlgorithm: 'ecdsa', hashFunction: 'sha384' },
        '1.2.840.10045.4.3.4': { signatureAlgorithm: 'ecdsa', hashFunction: 'sha512' },
    };
    return details[oid] || { signatureAlgorithm: `Unknown (${oid})`, hashFunction: 'Unknown' };
}