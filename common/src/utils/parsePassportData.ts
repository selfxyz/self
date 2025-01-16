import { PassportData } from '../../../common/src/utils/types';
import { findSubarrayIndex, formatMrz, getHashLen, hash } from './utils';
import { parseCertificateSimple } from './certificate_parsing/parseCertificateSimple';
import {
  CertificateData,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
  PublicKeyDetailsRSAPSS,
} from './certificate_parsing/dataStructure';
import { hashAlgos } from '../constants/constants';
import { brutforceSignatureAlgorithm } from './brutForcePassportSignature';
import { DscCertificateMetaData, parseDscCertificateData } from './parseDscCertificateData';

export interface PassportMetadata {
  dataGroups: string;
  dg1HashFunction: string;
  dg1HashOffset: number;
  dgPaddingBytes: number;
  eContentSize: number;
  eContentHashFunction: string;
  eContentHashOffset: number;
  signedAttrSize: number;
  signedAttrHashFunction: string;
  signatureAlgorithm: string;
  saltLength: number;
  curveOrExponent: string;
  signatureAlgorithmBits: number;
  countryCode: string;
  cscaFound: boolean;
  cscaHashFunction: string;
  cscaSignature: string;
  cscaSaltLength: number;
  cscaCurveOrExponent: string;
  cscaSignatureAlgorithmBits: number;
  dsc: string;
}

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

export function parsePassportData(passportData: PassportData): PassportMetadata {
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
  const { hashFunction: eContentHashFunction, offset: eContentHashOffset } = findHashSizeOfEContent(
    passportData.eContent,
    passportData.signedAttr
  );

  const brutForcedPublicKeyDetails = brutforceSignatureAlgorithm(passportData);

  let parsedDsc = null;
  let dscSignatureAlgorithmBits = 0;

  let brutForcedPublicKeyDetailsDsc: DscCertificateMetaData;

  if (passportData.dsc) {
    parsedDsc = parseCertificateSimple(passportData.dsc);
    dscSignatureAlgorithmBits = parseInt(parsedDsc.publicKeyDetails?.bits || '0');

    brutForcedPublicKeyDetailsDsc = parseDscCertificateData(parsedDsc);
  }

  return {
    dataGroups:
      passportData.dgPresents
        ?.toString()
        .split(',')
        .map((item) => item.replace('DG', ''))
        .join(',') || 'None',
    dg1HashFunction,
    dg1HashOffset,
    dgPaddingBytes,
    eContentSize: passportData.eContent?.length || 0,
    eContentHashFunction,
    eContentHashOffset,
    signedAttrSize: passportData.signedAttr?.length || 0,
    signedAttrHashFunction: brutForcedPublicKeyDetails.hashAlgorithm,
    signatureAlgorithm: brutForcedPublicKeyDetails.signatureAlgorithm,
    saltLength: brutForcedPublicKeyDetails.saltLength,
    curveOrExponent: parsedDsc ? getCurveOrExponent(parsedDsc) : 'unknown',
    signatureAlgorithmBits: dscSignatureAlgorithmBits,
    countryCode: passportData.mrz ? getCountryCodeFromMrz(passportData.mrz) : 'unknown',
    cscaFound: brutForcedPublicKeyDetailsDsc.cscaFound,
    cscaHashFunction: brutForcedPublicKeyDetailsDsc.cscaHashAlgorithm,
    cscaSignature: brutForcedPublicKeyDetailsDsc.cscaSignatureAlgorithm,
    cscaSaltLength: brutForcedPublicKeyDetailsDsc.cscaSaltLength,
    cscaCurveOrExponent: brutForcedPublicKeyDetailsDsc.cscaCurveOrExponent,
    cscaSignatureAlgorithmBits: brutForcedPublicKeyDetailsDsc.cscaSignatureAlgorithmBits,
    dsc: passportData.dsc,
  };
}
