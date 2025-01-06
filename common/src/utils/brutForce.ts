import { PassportData } from '../../../common/src/utils/types';
import { parseCertificateSimple } from './certificate_parsing/parseCertificateSimple';
import {
    PublicKeyDetailsECDSA,
    PublicKeyDetailsRSAPSS,
} from './certificate_parsing/dataStructure';
import forge from 'node-forge';
import * as asn1js from 'asn1js';
import { initElliptic } from './elliptic';
import { getCurveForElliptic } from './certificate_parsing/curves';
import { Certificate } from 'pkijs';
import { hashAlgos, saltLengths } from '../constants/constants';


export function brutforceSignatureAlgorithm(passportData: PassportData) {
    const parsedDsc = parseCertificateSimple(passportData.dsc);
    if (parsedDsc.signatureAlgorithm === 'ecdsa') {
        const hashAlgorithm = brutforceHashAlgorithm(passportData);
        return {
            signatureAlgorithm: 'ecdsa',
            hashAlgorithm: hashAlgorithm,
            saltLength: 0,
        };
    }
    else if (parsedDsc.signatureAlgorithm === 'rsa') {
        const hashAlgorithm = brutforceHashAlgorithm(passportData);
        if (hashAlgorithm) {
            return {
                signatureAlgorithm: 'rsa',
                hashAlgorithm: hashAlgorithm,
                saltLength: 0,
            };
        }
    }
    for (const saltLength of saltLengths) {
        const hashAlgorithm = brutforceHashAlgorithm(passportData, saltLength);
        if (hashAlgorithm) {
            return {
                signatureAlgorithm: 'rsapss',
                hashAlgorithm: hashAlgorithm,
                saltLength: saltLength,
            };
        }
    }

}

function brutforceHashAlgorithm(passportData: PassportData, saltLength?: number): any {
    for (const hashFunction of hashAlgos) {
        if (verifySignature(passportData, hashFunction, saltLength)) {
            return hashFunction;
        }
    }
    return false;
}


export function verifySignature(passportData: PassportData, hashAlgorithm: string, saltLength: number = 0): boolean {
    const elliptic = initElliptic();
    const { dsc, signedAttr, encryptedDigest } = passportData;
    const { signatureAlgorithm, publicKeyDetails } = parseCertificateSimple(dsc);

    if (signatureAlgorithm === 'ecdsa') {
        const certBuffer = Buffer.from(
            dsc.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''),
            'base64'
        );
        const asn1Data = asn1js.fromBER(certBuffer);
        const cert = new Certificate({ schema: asn1Data.result });
        const publicKeyInfo = cert.subjectPublicKeyInfo;
        const publicKeyBuffer = publicKeyInfo.subjectPublicKey.valueBlock.valueHexView;
        const curveForElliptic = getCurveForElliptic((publicKeyDetails as PublicKeyDetailsECDSA).curve);
        const ec = new elliptic.ec(curveForElliptic);

        const key = ec.keyFromPublic(publicKeyBuffer);
        const md = forge.md[hashAlgorithm].create();
        md.update(forge.util.binary.raw.encode(new Uint8Array(signedAttr)));
        const msgHash = md.digest().toHex();
        const signature_crypto = Buffer.from(encryptedDigest).toString('hex');

        return key.verify(msgHash, signature_crypto);
    } else {
        const cert = forge.pki.certificateFromPem(dsc);
        const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;

        const md = forge.md[hashAlgorithm].create();
        md.update(forge.util.binary.raw.encode(new Uint8Array(signedAttr)));

        const signature = Buffer.from(encryptedDigest).toString('binary');

        if (signatureAlgorithm === 'rsapss') {
            if (saltLength === 0) {
                throw new Error('Salt length is required for RSA-PSS');
            }
            try {
                const pss = forge.pss.create({
                    md: forge.md[hashAlgorithm].create(),
                    mgf: forge.mgf.mgf1.create(forge.md[hashAlgorithm].create()),
                    saltLength: saltLength || parseInt((publicKeyDetails as PublicKeyDetailsRSAPSS).saltLength),
                });
                return publicKey.verify(md.digest().bytes(), signature, pss);
            } catch (error) {
                return false;
            }
        } else {
            return publicKey.verify(md.digest().bytes(), signature);
        }
    }
}