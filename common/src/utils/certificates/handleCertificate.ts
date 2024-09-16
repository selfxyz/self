import * as asn1 from 'asn1js';
import { Certificate } from 'pkijs';
import { getHashLen } from '../utils';
import elliptic from 'elliptic';
import { parseRsaPublicKey, parseRsaPssPublicKey, parseECParameters } from './publicKeyDetails';
import { PublicKeyDetailsRSAPSS } from './dataStructure';
import { getNamedCurve } from './curves';

export function parseCertificate(pem: string) {
    const cert = getCertificateFromPem(pem);
    let { signatureAlgorithm, hashFunction } = getSignatureAlgorithmDetails(cert.signatureAlgorithm.algorithmId);
    const subjectPublicKeyInfo = cert.subjectPublicKeyInfo;
    let publicKeyDetails: any;
    switch (signatureAlgorithm) {
        case 'rsa':
            publicKeyDetails = parseRsaPublicKey(subjectPublicKeyInfo);
            if (!publicKeyDetails) {
                console.log('\x1b[33mRSA public key not found, probably ECDSA certificate\x1b[0m');
            }
            break;
        case 'rsapss':
            const rsaPssParams = cert.signatureAlgorithm.algorithmParams;
            publicKeyDetails = parseRsaPssPublicKey(subjectPublicKeyInfo, rsaPssParams);
            if (publicKeyDetails) {
                hashFunction = (publicKeyDetails as PublicKeyDetailsRSAPSS).hashFunction;
            }
            if (!publicKeyDetails) {
                console.log('\x1b[33mRSA-PSS public key not found\x1b[0m');
            }
            break;
        case 'ecdsa':
            publicKeyDetails = parseECParameters(subjectPublicKeyInfo);
            if (!publicKeyDetails) {
                console.log('\x1b[33mECDSA public key not found\x1b[0m');
            }
            break;
        default:
            console.log('\x1b[33mUnknown signature algorithm: \x1b[0m', signatureAlgorithm);
    }
    const hashLen = getHashLen(hashFunction);
    return { signatureAlgorithm, hashFunction, hashLen, ...publicKeyDetails };

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

export function gethashFunctionName(oid: string): string {
    const hashFunctions = {
        '1.3.14.3.2.26': 'sha1',
        '2.16.840.1.101.3.4.2.1': 'sha256',
        '2.16.840.1.101.3.4.2.2': 'sha384',
        '2.16.840.1.101.3.4.2.3': 'sha512',
    };
    return hashFunctions[oid] || `Unknown (${oid})`;
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


export const parseDSC = (pemContent: string) => {
    const certBuffer = Buffer.from(pemContent.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''), 'base64');
    const asn1Data = asn1.fromBER(certBuffer);
    const cert = new Certificate({ schema: asn1Data.result });
    const signatureAlgorithmOid = cert.signatureAlgorithm.algorithmId;
    const { signatureAlgorithm, hashFunction } = getSignatureAlgorithmDetails(signatureAlgorithmOid);
    const hashLen = getHashLen(hashFunction);

    let publicKeyDetails;
    if (signatureAlgorithm === 'ecdsa') {
        const subjectPublicKeyInfo = cert.subjectPublicKeyInfo;
        const algorithmParams = subjectPublicKeyInfo.algorithm.algorithmParams;
        const curveOid = asn1.fromBER(algorithmParams.valueBeforeDecode).result.valueBlock.toString();
        const curve = getNamedCurve(curveOid);

        const publicKeyBuffer = subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView;
        const curveForElliptic = curve === 'secp256r1' ? 'p256' : 'p384';
        const ec = new elliptic.ec(curveForElliptic);
        const key = ec.keyFromPublic(publicKeyBuffer);
        const x = key.getPublic().getX().toString('hex');
        const y = key.getPublic().getY().toString('hex');

        const fieldSizeMap: { [key: string]: number } = {
            'secp256r1': 256,
            'secp384r1': 384,
        };
        const bits = fieldSizeMap[curve]

        publicKeyDetails = { curve, x, y, bits };
    } else {
        const publicKey = cert.subjectPublicKeyInfo.subjectPublicKey;
        const asn1PublicKey = asn1.fromBER(publicKey.valueBlock.valueHexView);
        const rsaPublicKey = asn1PublicKey.result.valueBlock;
        const modulus = Buffer.from((rsaPublicKey as any).value[0].valueBlock.valueHexView).toString('hex');
        const exponent = Buffer.from((rsaPublicKey as any).value[1].valueBlock.valueHexView).toString('hex');
        const bits = Buffer.from(modulus, 'hex').length * 8;
        publicKeyDetails = { modulus, exponent, bits };
    }
    return { signatureAlgorithm, hashFunction, hashLen, ...publicKeyDetails };
}
