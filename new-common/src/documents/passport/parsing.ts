import { hashAlgos } from '../../foundation/constants/crypto.js';
import { findSubarrayIndex } from '../../foundation/arrays.js';
import type {
  CertificateData,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
} from '../../foundation/types/certificate.js';
import type { PassportData, PassportMetadata } from '../../foundation/types/document.js';
import { getHashLen, hash } from '../../crypto/hash/sha.js';
import { parseCertificateSimple } from '../../certificates/parsing/parseCertificateSimple.js';
import {
  parseDscCertificateData,
  type DscCertificateMetaData,
} from '../../certificates/parsing/parseDscCertificateData.js';
import { bruteForceSignatureAlgorithm } from './bruteForcePassportSignature.js';
import { formatMrz } from './format.js';

function findHashSizeOfEContent(eContent: number[], signedAttr: number[]) {
  for (const hashFunction of hashAlgos) {
    const hashValue = hash(hashFunction, eContent);
    const hashOffset = findSubarrayIndex(signedAttr, hashValue as number[]);
    if (hashOffset !== -1) {
      return { hashFunction, offset: hashOffset };
    }
  }
  return { hashFunction: 'unknown', offset: -1 };
}

function findDG1HashInEContent(
  mrz: string,
  eContent: number[]
): { hash: number[]; hashFunction: string; offset: number } | null {
  const formattedMrz = formatMrz(mrz);

  for (const hashFunction of hashAlgos) {
    const hashValue = hash(hashFunction, formattedMrz);
    const normalizedHash = (hashValue as number[]).map((byte) => (byte > 127 ? byte - 256 : byte));
    const hashOffset = findSubarrayIndex(eContent, normalizedHash);

    if (hashOffset !== -1) {
      return { hash: hashValue as number[], hashFunction, offset: hashOffset };
    }
  }
  return null;
}

function getDgPaddingBytes(passportData: PassportData, dg1HashFunction: string): number {
  const formattedMrz = formatMrz(passportData.mrz);
  const hashValue = hash(dg1HashFunction, formattedMrz);
  const normalizedHash = (hashValue as number[]).map((byte) => (byte > 127 ? byte - 256 : byte));
  const dg1HashOffset = findSubarrayIndex(passportData.eContent, normalizedHash);
  const dg2Hash = passportData.dg2Hash;
  const normalizedDg2Hash = (dg2Hash as number[]).map((byte) => (byte > 127 ? byte - 256 : byte));
  const dg2HashOffset = findSubarrayIndex(passportData.eContent, normalizedDg2Hash);
  return dg2HashOffset - dg1HashOffset - getHashLen(dg1HashFunction);
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

export function parsePassportData(
  passportData: PassportData,
  skiPem: any = null
): PassportMetadata {
  const dg1HashInfo = passportData.mrz
    ? findDG1HashInEContent(passportData.mrz, passportData.eContent)
    : null;

  const dg1HashFunction = dg1HashInfo?.hashFunction || 'unknown';
  const dg1HashOffset = dg1HashInfo?.offset || 0;
  let dgPaddingBytes = -1;
  try {
    dgPaddingBytes = getDgPaddingBytes(passportData, dg1HashFunction);
  } catch (error) {
    console.error('Error getting DG padding bytes:', error);
  }
  const { hashFunction: eContentHashFunction, offset: eContentHashOffset } =
    findHashSizeOfEContent(passportData.eContent, passportData.signedAttr);

  const brutForcedPublicKeyDetails = bruteForceSignatureAlgorithm(passportData);

  let parsedDsc = null;
  let dscSignatureAlgorithmBits = 0;

  let dscMetaData!: DscCertificateMetaData;

  if (passportData.dsc) {
    parsedDsc = parseCertificateSimple(passportData.dsc);
    dscSignatureAlgorithmBits = parseInt(parsedDsc.publicKeyDetails?.bits || '0');
    dscMetaData = parseDscCertificateData(parsedDsc, skiPem);
  }

  return {
    dataGroups:
      passportData.dgPresents
        ?.toString()
        .split(',')
        .map((item) => item.replace('DG', ''))
        .join(',') || 'None',
    dg1Size: passportData.mrz ? passportData.mrz.length : 0,
    dg1HashSize: passportData.dg1Hash ? passportData.dg1Hash.length : 0,
    dg1HashFunction,
    dg1HashOffset,
    dgPaddingBytes,
    eContentSize: passportData.eContent?.length || 0,
    eContentHashFunction,
    eContentHashOffset,
    signedAttrSize: passportData.signedAttr?.length || 0,
    signedAttrHashFunction: brutForcedPublicKeyDetails!.hashAlgorithm || 'unknown',
    signatureAlgorithm: brutForcedPublicKeyDetails!.signatureAlgorithm,
    saltLength: brutForcedPublicKeyDetails!.saltLength,
    curveOrExponent: parsedDsc ? getCurveOrExponent(parsedDsc) : 'unknown',
    signatureAlgorithmBits: dscSignatureAlgorithmBits,
    countryCode: passportData.mrz ? getCountryCodeFromMrz(passportData.mrz) : 'unknown',
    cscaFound: dscMetaData.cscaFound,
    cscaHashFunction: dscMetaData.cscaHashAlgorithm,
    cscaSignatureAlgorithm: dscMetaData.cscaSignatureAlgorithm,
    cscaSaltLength: dscMetaData.cscaSaltLength,
    cscaCurveOrExponent: dscMetaData.cscaCurveOrExponent,
    cscaSignatureAlgorithmBits: dscMetaData.cscaSignatureAlgorithmBits,
    dsc: passportData.dsc,
    csca: dscMetaData?.csca || '',
  };
}

export function initPassportDataParsing(passportData: PassportData, skiPem: any = null) {
  const passportMetadata = parsePassportData(passportData, skiPem);
  passportData.passportMetadata = passportMetadata;
  const dscParsed = parseCertificateSimple(passportData.dsc);
  passportData.dsc_parsed = dscParsed;
  if (passportData.passportMetadata.csca) {
    const cscaParsed = parseCertificateSimple(passportData.passportMetadata.csca);
    passportData.csca_parsed = cscaParsed;
  }
  return passportData;
}
