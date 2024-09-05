
import * as asn1 from 'asn1js';
import { getNamedCurve, identifyCurve, StandardCurve } from './curves';
import * as fs from 'fs';
import * as path from 'path';
import { Certificate } from 'pkijs';

export function getSignatureAlgorithmDetails(oid: string): { signatureAlgorithm: 'rsa' | 'ecdsa' | 'rsa-pss' | 'Unknown', hashAlgorithm: string } {
    const details = {
        '1.2.840.113549.1.1.5': { signatureAlgorithm: 'rsa', hashAlgorithm: 'sha1' },
        '1.2.840.113549.1.1.11': { signatureAlgorithm: 'rsa', hashAlgorithm: 'sha256' },
        '1.2.840.113549.1.1.12': { signatureAlgorithm: 'rsa', hashAlgorithm: 'sha384' },
        '1.2.840.113549.1.1.13': { signatureAlgorithm: 'rsa', hashAlgorithm: 'sha512' },
        // rsapss
        '1.2.840.113549.1.1.10': { signatureAlgorithm: 'rsa-pss', hashAlgorithm: 'variable' },
        // ecdsa
        '1.2.840.10045.4.1': { signatureAlgorithm: 'ecdsa', hashAlgorithm: 'sha1' },
        '1.2.840.10045.4.3.1': { signatureAlgorithm: 'ecdsa', hashAlgorithm: 'sha224' },
        '1.2.840.10045.4.3.2': { signatureAlgorithm: 'ecdsa', hashAlgorithm: 'sha256' },
        '1.2.840.10045.4.3.3': { signatureAlgorithm: 'ecdsa', hashAlgorithm: 'sha384' },
        '1.2.840.10045.4.3.4': { signatureAlgorithm: 'ecdsa', hashAlgorithm: 'sha512' },
    };
    return details[oid] || { signatureAlgorithm: `Unknown (${oid})`, hashAlgorithm: 'Unknown' };
}
export function getHashAlgorithmName(oid: string): string {
    const hashAlgorithms = {
        '1.3.14.3.2.26': 'sha1',
        '2.16.840.1.101.3.4.2.1': 'sha256',
        '2.16.840.1.101.3.4.2.2': 'sha384',
        '2.16.840.1.101.3.4.2.3': 'sha512',
    };
    return hashAlgorithms[oid] || `Unknown (${oid})`;
}



export function getCertificateFromPem(pemContent: string): Certificate {
    const certBuffer = Buffer.from(pemContent.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''), 'base64');
    const asn1Data = asn1.fromBER(certBuffer);
    return new Certificate({ schema: asn1Data.result });
}

export const getSubjectKeyIdentifier = (cert: Certificate): string => {
    const subjectKeyIdentifier = cert.extensions.find(
        (ext) => ext.extnID === '2.5.29.14' // OID for Subject Key Identifier
    );
    if (subjectKeyIdentifier) {
        let skiValue = Buffer.from(subjectKeyIdentifier.extnValue.valueBlock.valueHexView).toString('hex');

        skiValue = skiValue.replace(/^(?:3016)?(?:0414)?/, '');
        return skiValue
    } else {
        return null;
    }
}

export function getIssuerCountryCode(cert: Certificate): string {
    const issuerRDN = cert.issuer.typesAndValues;
    let issuerCountryCode = '';
    for (const rdn of issuerRDN) {
        if (rdn.type === '2.5.4.6') { // OID for Country Name
            issuerCountryCode = rdn.value.valueBlock.value;
            break;
        }
    }
    return issuerCountryCode.toUpperCase();
}