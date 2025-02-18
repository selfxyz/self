import { brutforceSignatureAlgorithmDsc } from './brutForceDscSignature';
import { CertificateData } from '../../certificate_parsing/dataStructure';
import { parseCertificateSimple } from '../../certificate_parsing/parseCertificateSimple';
import { getCSCAFromSKI } from '../../csca';
import { getCurveOrExponent } from './parsePassportData';

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

export function parseDscCertificateData(dscCert: CertificateData): DscCertificateMetaData {
  let csca,
    cscaParsed,
    cscaHashAlgorithm,
    cscaSignatureAlgorithm,
    cscaCurveOrExponent,
    cscaSignatureAlgorithmBits,
    cscaSaltLength;

  let cscaFound = false;
  console.log('js: dscCert ski', dscCert.subjectKeyIdentifier);
  if (dscCert.authorityKeyIdentifier) {
    try {
      csca = getCSCAFromSKI(dscCert.authorityKeyIdentifier, true);
      console.log('js: csca', csca);
      if (csca) {
        cscaParsed = parseCertificateSimple(csca);
        console.log('js: cscaParsed', cscaParsed);
        const details = brutforceSignatureAlgorithmDsc(dscCert, cscaParsed);
        cscaFound = true;
        cscaHashAlgorithm = details.hashAlgorithm;
        cscaSignatureAlgorithm = details.signatureAlgorithm;
        cscaCurveOrExponent = getCurveOrExponent(cscaParsed);
        cscaSignatureAlgorithmBits = parseInt(cscaParsed.publicKeyDetails.bits);
        cscaSaltLength = details.saltLength;
      }
    } catch (error) { }
  }
  else {
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
