import { brutforceSignatureAlgorithmDsc } from './brutForceDscSignature';
import { CertificateData } from './certificate_parsing/dataStructure';
import { parseCertificateSimple } from './certificate_parsing/parseCertificateSimple';
import { getCSCAFromSKI } from './csca';
import { getCurveOrExponent } from './parsePassportData';

export interface DscCertificateMetaData {
  cscaFound: boolean;
  cscaHashAlgorithm: string;
  cscaSignatureAlgorithm: string;
  cscaCurveOrExponent: string;
  cscaSignatureAlgorithmBits: number;
  cscaSaltLength: number;
}

export function parseDscCertificateData(dscCert: CertificateData): any {
  let csca,
    parsedCsca,
    cscaHashAlgorithm,
    cscaSignatureAlgorithm,
    cscaCurveOrExponent,
    cscaSignatureAlgorithmBits,
    cscaSaltLength;
  let cscaFound = false;
  if (dscCert.authorityKeyIdentifier) {
    try {
      csca = getCSCAFromSKI(dscCert.authorityKeyIdentifier, true);
      if (csca) {
        parsedCsca = parseCertificateSimple(csca);
        const details = brutforceSignatureAlgorithmDsc(dscCert, parsedCsca);
        cscaFound = true;
        cscaHashAlgorithm = details.hashAlgorithm;
        cscaSignatureAlgorithm = details.signatureAlgorithm;
        cscaCurveOrExponent = getCurveOrExponent(parsedCsca);
        cscaSignatureAlgorithmBits = parseInt(parsedCsca.publicKeyDetails.bits);
        cscaSaltLength = details.saltLength;
      }
    } catch (error) {}
  }
  return {
    cscaFound,
    cscaHashAlgorithm,
    cscaSignatureAlgorithm,
    cscaCurveOrExponent,
    cscaSignatureAlgorithmBits,
    cscaSaltLength,
  };
}
