import type { CertificateData } from '../../certificate_parsing/dataStructure.js';
import { parseCertificateSimple } from '../../certificate_parsing/parseCertificateSimple.js';
import { getCSCAFromSKI } from '../../csca.js';
import { brutforceSignatureAlgorithmDsc } from './brutForceDscSignature.js';
import { getCurveOrExponent } from './parsePassportData.js';

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

export function parseDscCertificateData(
  dscCert: CertificateData,
  skiPem: any = null
): DscCertificateMetaData {
  let csca,
    cscaParsed,
    cscaHashAlgorithm,
    cscaSignatureAlgorithm,
    cscaCurveOrExponent,
    cscaSignatureAlgorithmBits,
    cscaSaltLength;
  let cscaFound = false;
  if (dscCert.authorityKeyIdentifier) {
    try {
      csca = getCSCAFromSKI(dscCert.authorityKeyIdentifier, skiPem);
      if (csca) {
        cscaParsed = parseCertificateSimple(csca);
        const details = brutforceSignatureAlgorithmDsc(dscCert, cscaParsed);
        cscaFound = true;
        if (details && details.hashAlgorithm && details.signatureAlgorithm) {
          cscaHashAlgorithm = details.hashAlgorithm;
          cscaSignatureAlgorithm = details.signatureAlgorithm;
          cscaSaltLength = details.saltLength;
        } else if (cscaParsed) {
          cscaHashAlgorithm = cscaParsed.hashAlgorithm;
          cscaSignatureAlgorithm = cscaParsed.signatureAlgorithm;
          cscaSaltLength = 0;
        }
        cscaCurveOrExponent = getCurveOrExponent(cscaParsed);
        cscaSignatureAlgorithmBits = parseInt(cscaParsed.publicKeyDetails.bits);
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
  };
}
