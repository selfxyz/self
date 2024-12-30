import { PassportData } from '../../../common/src/utils/types';
import { findSubarrayIndex, formatMrz, hash } from '../../../common/src/utils/utils';
import { parseCertificateSimple } from '../../../common/src/utils/certificate_parsing/parseCertificateSimple';
import { CertificateData, PublicKeyDetailsECDSA, PublicKeyDetailsRSA, PublicKeyDetailsRSAPSS } from '../../../common/src/utils/certificate_parsing/dataStructure';
import { getCSCAFromSKI } from '../../../common/src/utils/csca';

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
    const allHashes = ['sha512', 'sha384', 'sha256', 'sha1'];
    for (const hashFunction of allHashes) {
        const hashValue = hash(hashFunction, eContent);
        const hashOffset = findSubarrayIndex(signedAttr, hashValue);
        if (hashOffset !== -1) {
            return { hashFunction, offset: hashOffset };
        }
    }
    return { hashFunction: 'unknown', offset: -1 };
}

export function findDG1HashInEContent(mrz: string, eContent: number[]): { hash: number[], hashFunction: string } | null {
    const hashFunctions = ['sha512', 'sha384', 'sha256', 'sha1'];
    const formattedMrz = formatMrz(mrz);

    for (const hashFunction of hashFunctions) {
        const hashValue = hash(hashFunction, formattedMrz);
        const hashOffset = findSubarrayIndex(eContent, hashValue);

        if (hashOffset !== -1) {
            return { hash: hashValue, hashFunction };
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

export function parsePassportData(passportData: PassportData): PassportMetadata {
    // Extract DG1 hash info
    const dg1HashInfo = passportData.mrz ?
        findDG1HashInEContent(passportData.mrz, passportData.eContent) :
        null;

    // Use extracted DG1 hash if found, otherwise use provided dg1Hash
    const dg1Hash = dg1HashInfo?.hash || passportData.dg1Hash;
    const dg1HashFunction = dg1HashInfo?.hashFunction || 'unknown';

    const dg1HashOffset = dg1Hash
        ? findSubarrayIndex(
            passportData.eContent,
            dg1Hash.map(byte => byte > 127 ? byte - 256 : byte)
        )
        : 0;

    const { hashFunction: eContentHashFunction, offset: eContentHashOffset } =
        findHashSizeOfEContent(passportData.eContent, passportData.signedAttr);

    const parsedDsc: CertificateData | null = passportData.dsc ?
        parseCertificateSimple(passportData.dsc) :
        null;

    const dscHashFunction = parsedDsc ?
        parsedDsc.hashAlgorithm :
        'unknown';

    const dscSignature = parsedDsc ?
        parsedDsc.signatureAlgorithm :
        'unknown';

    const dscSignatureAlgorithmDetails = parsedDsc ?
        getSimplePublicKeyDetails(parsedDsc) :
        'unknown';

    const dscSignatureAlgorithmBits = parsedDsc ?
        parsedDsc.publicKeyDetails?.bits :
        'unknown';

    const dscAKI = parsedDsc ?
        parsedDsc.authorityKeyIdentifier :
        'unknown';

    let csca: string | null = null;
    if (dscAKI) {
        csca = getCSCAFromSKI(dscAKI, true);
    }
    const parsedCsca = csca ?
        parseCertificateSimple(csca) :
        null;

    const cscaHashFunction = parsedCsca ?
        parsedCsca.hashAlgorithm :
        'unknown';

    const cscaSignature = parsedCsca ?
        parsedCsca.signatureAlgorithm :
        'unknown';

    const cscaSignatureAlgorithmDetails = parsedCsca ?
        getCurveOrExponent(parsedCsca) :
        'unknown';

    const cscaSignatureAlgorithmBits = parsedCsca ?
        parsedCsca.publicKeyDetails?.bits :
        'unknown';


    return {
        dataGroups: passportData.dgPresents?.toString().split(',').map(item => item.replace('DG', '')).join(',') || 'None',
        dg1HashFunction,
        dg1HashOffset,
        eContentSize: passportData.eContent?.length || 0,
        eContentHashFunction,
        eContentHashOffset,
        signedAttrSize: passportData.signedAttr?.length || 0,
        signedAttrHashFunction: dscHashFunction,
        signatureAlgorithm: dscSignature,
        signatureAlgorithmDetails: dscSignatureAlgorithmDetails,
        curveOrExponent: parsedDsc ? getCurveOrExponent(parsedDsc) : 'unknown',
        signatureAlgorithmBits: dscSignatureAlgorithmBits ? parseInt(dscSignatureAlgorithmBits) : 0,
        countryCode: passportData.mrz ? getCountryCodeFromMrz(passportData.mrz) : 'unknown',
        cscaFound: !!csca,
        cscaHashFunction,
        cscaSignature,
        cscaSignatureAlgorithmDetails,
        cscaCurveOrExponent: parsedCsca ? getCurveOrExponent(parsedCsca) : 'unknown',
        cscaSignatureAlgorithmBits: cscaSignatureAlgorithmBits ? parseInt(cscaSignatureAlgorithmBits) : 0,
        dsc: passportData.dsc
    };
}
