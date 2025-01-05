import { PassportData } from '../../../common/src/utils/types';
import { findSubarrayIndex, formatMrz, hash } from './utils';
import { parseCertificateSimple } from './certificate_parsing/parseCertificateSimple';
import { CertificateData, PublicKeyDetailsECDSA, PublicKeyDetailsRSA, PublicKeyDetailsRSAPSS } from './certificate_parsing/dataStructure';
import { getCSCAFromSKI } from './csca';
import { hashAlgos } from '../constants/constants';
import { Certificate } from 'pkijs';
import forge from 'node-forge';
import * as asn1js from 'asn1js';
import { initElliptic } from './elliptic';
import { getCurveForElliptic } from './certificate_parsing/curves';

export interface PassportMetadata {
    dataGroups: string;
    dg1HashFunction: string;
    dg1HashOffset: number;
    eContentSize: number;
    eContentHashFunction: string;
    eContentHashOffset: number;
    signedAttrSize: number;
    signedAttrHashFunction: string;
    signatureAlgorithm: string;
    signatureAlgorithmDetails: string;
    curveOrExponent: string;
    signatureAlgorithmBits: number;
    countryCode: string;
    cscaFound: boolean;
    cscaHashFunction: string;
    cscaSignature: string;
    cscaSignatureAlgorithmDetails: string;
    cscaCurveOrExponent: string;
    cscaSignatureAlgorithmBits: number;
    dsc: string;
}

export function findHashSizeOfEContent(eContent: number[], signedAttr: number[]) {
    for (const hashFunction of hashAlgos) {
        const hashValue = hash(hashFunction, eContent);
        const hashOffset = findSubarrayIndex(signedAttr, hashValue);
        if (hashOffset !== -1) {
            return { hashFunction, offset: hashOffset };
        }
    }
    return { hashFunction: 'unknown', offset: -1 };
}

export function findDG1HashInEContent(mrz: string, eContent: number[]): { hash: number[], hashFunction: string, offset: number } | null {
    const formattedMrz = formatMrz(mrz);

    for (const hashFunction of hashAlgos) {
        const hashValue = hash(hashFunction, formattedMrz);
        const normalizedHash = hashValue.map(byte => byte > 127 ? byte - 256 : byte);
        const hashOffset = findSubarrayIndex(eContent, normalizedHash);

        if (hashOffset !== -1) {
            return { hash: hashValue, hashFunction, offset: hashOffset };
        }
    }
    return null;
}

export function getCountryCodeFromMrz(mrz: string): string {
    return mrz.substring(2, 5);
}

export function getCurveOrExponent(certData: CertificateData): string {
    if (certData.signatureAlgorithm === 'rsapss' || certData.signatureAlgorithm === 'rsa') {
        return (certData.publicKeyDetails as PublicKeyDetailsRSA).exponent;
    }
    return (certData.publicKeyDetails as PublicKeyDetailsECDSA).curve;
}

export function getSimplePublicKeyDetails(certData: CertificateData): string {
    interface SimplePublicKeyDetails {
        exponent?: string;
        curve?: string;
        hashAlgorithm?: string;
        saltLength?: string;

    }
    const simplePublicKeyDetails: SimplePublicKeyDetails = {};
    if (certData.signatureAlgorithm === 'rsapss' || certData.signatureAlgorithm === 'rsa') {
        simplePublicKeyDetails.exponent = (certData.publicKeyDetails as PublicKeyDetailsRSA).exponent;
        if (certData.signatureAlgorithm === 'rsapss') {
            simplePublicKeyDetails.hashAlgorithm = (certData.publicKeyDetails as PublicKeyDetailsRSAPSS).hashAlgorithm;
            simplePublicKeyDetails.saltLength = (certData.publicKeyDetails as PublicKeyDetailsRSAPSS).saltLength;
        }
    }
    else if (certData.signatureAlgorithm === 'ecdsa') {
        simplePublicKeyDetails.curve = (certData.publicKeyDetails as PublicKeyDetailsECDSA).curve;
    }
    return JSON.stringify(simplePublicKeyDetails);
}

export function verifySignature(passportData: PassportData, hashAlgorithm: string): boolean {
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
            try {
                const pss = forge.pss.create({
                    md: forge.md[hashAlgorithm].create(),
                    mgf: forge.mgf.mgf1.create(forge.md[hashAlgorithm].create()),
                    saltLength: parseInt((publicKeyDetails as PublicKeyDetailsRSAPSS).saltLength),
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

export function brutforceHashAlgorithm(passportData: PassportData): any {
    for (const hashFunction of hashAlgos) {
        if (verifySignature(passportData, hashFunction)) {
            return hashFunction;
        }
    }
    return null;
}

export function parsePassportData(passportData: PassportData): PassportMetadata {
    const dg1HashInfo = passportData.mrz ?
        findDG1HashInEContent(passportData.mrz, passportData.eContent) :
        null;

    const dg1HashFunction = dg1HashInfo?.hashFunction || 'unknown';
    const dg1HashOffset = dg1HashInfo?.offset || 0;

    const { hashFunction: eContentHashFunction, offset: eContentHashOffset } =
        findHashSizeOfEContent(passportData.eContent, passportData.signedAttr);

    const signatureHashAlgo = brutforceHashAlgorithm(passportData);

    let parsedDsc = null;
    let parsedCsca = null;
    let csca = null;
    let dscSignature = 'unknown';
    let dscSignatureAlgorithmDetails = 'unknown';
    let dscSignatureAlgorithmBits = 0;
    let cscaHashFunction = 'unknown';
    let cscaSignature = 'unknown';
    let cscaSignatureAlgorithmDetails = 'unknown';
    let cscaSignatureAlgorithmBits = 0;

    if (passportData.dsc) {
        parsedDsc = parseCertificateSimple(passportData.dsc);
        dscSignature = parsedDsc.signatureAlgorithm;
        dscSignatureAlgorithmDetails = getSimplePublicKeyDetails(parsedDsc);
        dscSignatureAlgorithmBits = parseInt(parsedDsc.publicKeyDetails?.bits || '0');

        if (parsedDsc.authorityKeyIdentifier) {
            csca = getCSCAFromSKI(parsedDsc.authorityKeyIdentifier, true);
            if (csca) {
                parsedCsca = parseCertificateSimple(csca);
                cscaHashFunction = parsedCsca.hashAlgorithm;
                cscaSignature = parsedCsca.signatureAlgorithm;
                cscaSignatureAlgorithmDetails = getSimplePublicKeyDetails(parsedCsca);
                cscaSignatureAlgorithmBits = parseInt(parsedCsca.publicKeyDetails?.bits || '0');
            }
        }
    }

    return {
        dataGroups: passportData.dgPresents?.toString().split(',').map(item => item.replace('DG', '')).join(',') || 'None',
        dg1HashFunction,
        dg1HashOffset,
        eContentSize: passportData.eContent?.length || 0,
        eContentHashFunction,
        eContentHashOffset,
        signedAttrSize: passportData.signedAttr?.length || 0,
        signedAttrHashFunction: signatureHashAlgo,
        signatureAlgorithm: dscSignature,
        signatureAlgorithmDetails: dscSignatureAlgorithmDetails,
        curveOrExponent: parsedDsc ? getCurveOrExponent(parsedDsc) : 'unknown',
        signatureAlgorithmBits: dscSignatureAlgorithmBits,
        countryCode: passportData.mrz ? getCountryCodeFromMrz(passportData.mrz) : 'unknown',
        cscaFound: !!csca,
        cscaHashFunction,
        cscaSignature,
        cscaSignatureAlgorithmDetails,
        cscaCurveOrExponent: parsedCsca ? getCurveOrExponent(parsedCsca) : 'unknown',
        cscaSignatureAlgorithmBits: cscaSignatureAlgorithmBits,
        dsc: passportData.dsc
    };
}
