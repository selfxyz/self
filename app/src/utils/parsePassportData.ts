import { PassportData } from '../../../common/src/utils/types';
import { findSubarrayIndex, formatMrz, hash } from '../../../common/src/utils/utils';
import { parseCertificate } from '../../../common/src/utils/certificates/handleCertificate';

export interface PassportMetadata {
    dataGroups: string;
    dg1HashFunction: string;
    dg1HashOffset: number;
    eContentSize: number;
    eContentHashFunction: string;
    eContentHashOffset: number;
    signedAttrSize: number;
    signedAttrHashFunction: string;
    countryCode?: string;
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

    const dscHashFunction = passportData.dsc ?
        parseCertificate(passportData.dsc).hashFunction :
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
        countryCode: passportData.mrz ? getCountryCodeFromMrz(passportData.mrz) : undefined
    };
}
