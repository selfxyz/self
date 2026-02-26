import type {
  CertificateData,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
} from '../../foundation/types/certificate.js';
import { getCSCAFromSKI } from '../csca.js';
import { bruteForceSignatureAlgorithmDsc } from './bruteForceSignature.js';
import { parseCertificateSimple } from './parseCertificateSimple.js';

export interface DscCertificateMetaData {
  cscaFound: boolean;
  cscaHashAlgorithm: string;
  cscaSignatureAlgorithm: string;
  cscaCurveOrExponent: string;
  cscaSignatureAlgorithmBits: number;
  cscaSaltLength: number;
  csca: string;
  cscaParsed: CertificateData;
  cscaBits: number;
}

export function getCurveOrExponent(certData: CertificateData): string {
  if (certData.signatureAlgorithm === 'rsapss' || certData.signatureAlgorithm === 'rsa') {
    return (certData.publicKeyDetails as PublicKeyDetailsRSA).exponent;
  }
  return (certData.publicKeyDetails as PublicKeyDetailsECDSA).curve;
}

export function parseDscCertificateData(
  dscCert: CertificateData,
  skiPem: any = null
): DscCertificateMetaData {
  let csca: string | undefined,
    cscaParsed: CertificateData | undefined,
    cscaHashAlgorithm: string | undefined,
    cscaSignatureAlgorithm: string | undefined,
    cscaCurveOrExponent: string | undefined,
    cscaSignatureAlgorithmBits: number | undefined,
    cscaSaltLength: number | undefined;
  let cscaFound = false;
  if (dscCert.authorityKeyIdentifier) {
    try {
      csca = getCSCAFromSKI(dscCert.authorityKeyIdentifier, skiPem);
      if (csca) {
        cscaParsed = parseCertificateSimple(csca);
        const details = bruteForceSignatureAlgorithmDsc(dscCert, cscaParsed);
        cscaFound = true;
        cscaHashAlgorithm = details.hashAlgorithm;
        cscaSignatureAlgorithm = details.signatureAlgorithm;
        cscaCurveOrExponent = getCurveOrExponent(cscaParsed);
        cscaSignatureAlgorithmBits = parseInt(cscaParsed.publicKeyDetails!.bits);
        cscaSaltLength = details.saltLength;
      }
    } catch (error) {}
  } else {
    console.log('js: dscCert.authorityKeyIdentifier not found');
  }
  return {
    cscaFound: cscaFound,
    cscaHashAlgorithm: cscaHashAlgorithm,
    cscaSignatureAlgorithm: cscaSignatureAlgorithm,
    cscaCurveOrExponent: cscaCurveOrExponent,
    cscaSignatureAlgorithmBits: cscaSignatureAlgorithmBits,
    cscaSaltLength: cscaSaltLength,
    csca: csca,
    cscaParsed: cscaParsed,
    cscaBits: cscaSignatureAlgorithmBits,
  } as DscCertificateMetaData;
}
