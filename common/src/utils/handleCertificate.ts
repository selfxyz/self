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

export function getSignatureAlgorithmDetails(oid: string): { signatureAlgorithm: string, hashFunction: string } {
    const details = {
        '1.2.840.113549.1.1.5': { signatureAlgorithm: 'RSA', hashFunction: 'SHA-1' },
        '1.2.840.113549.1.1.11': { signatureAlgorithm: 'RSA', hashFunction: 'SHA-256' },
        '1.2.840.113549.1.1.12': { signatureAlgorithm: 'RSA', hashFunction: 'SHA-384' },
        '1.2.840.113549.1.1.13': { signatureAlgorithm: 'RSA', hashFunction: 'SHA-512' },
        // rsapss
        '1.2.840.113549.1.1.10': { signatureAlgorithm: 'RSA-PSS', hashFunction: 'Variable' },
        // ecdsa
        '1.2.840.10045.4.1': { signatureAlgorithm: 'ECDSA', hashFunction: 'SHA-1' },
        '1.2.840.10045.4.3.1': { signatureAlgorithm: 'ECDSA', hashFunction: 'SHA-224' },
        '1.2.840.10045.4.3.2': { signatureAlgorithm: 'ECDSA', hashFunction: 'SHA-256' },
        '1.2.840.10045.4.3.3': { signatureAlgorithm: 'ECDSA', hashFunction: 'SHA-384' },
        '1.2.840.10045.4.3.4': { signatureAlgorithm: 'ECDSA', hashFunction: 'SHA-512' },
    };
    return details[oid] || { signatureAlgorithm: `Unknown (${oid})`, hashFunction: 'Unknown' };
}

export const getVKey = (signatureAlgorithm: string, hashFunction: string) => {
    let vkey: any = '';
    if (signatureAlgorithm === 'RSA' && hashFunction === 'SHA-256') {
        vkey = vkey_prove_rsa_65537_sha256;
    }
    else if (signatureAlgorithm === 'RSA' && hashFunction === 'SHA-1') {
        // vkey = vkey_prove_rsa_65537_sha1;
    }
    return vkey;
}
