import * as asn1 from 'asn1js';
import { Certificate } from 'pkijs';
import { getHashLen } from './utils';
import { getNamedCurve } from '../../../registry/src/utils/curves';
import elliptic from 'elliptic';

export const getSignatureAlgorithm = (pemContent: string) => {
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
        publicKeyDetails = { curve, x, y };
    } else {
        const publicKey = cert.subjectPublicKeyInfo.subjectPublicKey;
        const asn1PublicKey = asn1.fromBER(publicKey.valueBlock.valueHexView);
        const rsaPublicKey = asn1PublicKey.result.valueBlock;
        const modulus = Buffer.from((rsaPublicKey as any).value[0].valueBlock.valueHexView).toString('hex');
        const exponent = Buffer.from((rsaPublicKey as any).value[1].valueBlock.valueHexView).toString('hex');
        publicKeyDetails = { modulus, exponent };
    }
    console.log(publicKeyDetails);
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