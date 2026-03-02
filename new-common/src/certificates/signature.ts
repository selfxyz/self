import forge from 'node-forge';

import {
  k_csca,
  k_dsc,
  k_dsc_3072,
  k_dsc_4096,
  k_dsc_ecdsa,
  n_csca,
  n_dsc,
  n_dsc_3072,
  n_dsc_4096,
  n_dsc_ecdsa,
} from '../foundation/constants/crypto.js';
import { bytesToBigDecimal, hexToDecimal, splitToWords } from '../foundation/bytes.js';
import type {
  CertificateData,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
} from '../foundation/types/certificate.js';
import type { SignatureAlgorithm } from '../foundation/types/document.js';
import { getCertificateFromPem } from './parsing/parseCertificateSimple.js';

function formatInputToStrings(input: string[]): string[] {
  return input.map(item => BigInt(item).toString());
}

export function extractRSFromSignature(signatureBytes: number[]): { r: string; s: string } {
  const derSignature = Buffer.from(signatureBytes).toString('binary');
  const asn1 = forge.asn1.fromDer(derSignature);
  const signatureAsn1 = asn1.value;

  if (signatureAsn1.length !== 2) {
    throw new Error('Invalid signature format');
  }

  if (!Array.isArray(asn1.value) || asn1.value.length !== 2) {
    throw new Error('Invalid signature format');
  }
  const r = forge.util.createBuffer(asn1.value[0].value as string).toHex();
  const s = forge.util.createBuffer(asn1.value[1].value as string).toHex();

  return { r, s };
}

export function extractSignatureFromDSC(dscCertificate: string) {
  const cert = getCertificateFromPem(dscCertificate);
  const dscSignature = cert.signatureValue.valueBlock.valueHexView;
  return Array.from(dscSignature);
}

export function formatSignatureDSCCircuit(
  cscaSignatureAlgorithm: string,
  cscaHashFunction: string,
  cscaCertificateData: CertificateData,
  signature: number[],
): string[] {
  const cscaSignatureAlgorithmFullName = getSignatureAlgorithmFullName(
    cscaCertificateData,
    cscaSignatureAlgorithm,
    cscaHashFunction,
  );
  const { n, k } = getNAndK(cscaSignatureAlgorithmFullName as SignatureAlgorithm);
  if (cscaSignatureAlgorithm === 'ecdsa') {
    const { r, s } = extractRSFromSignature(signature);
    const signature_r = splitToWords(BigInt(hexToDecimal(r)), n, k);
    const signature_s = splitToWords(BigInt(hexToDecimal(s)), n, k);
    return [...signature_r, ...signature_s];
  } else {
    return formatInputToStrings(splitToWords(BigInt(bytesToBigDecimal(signature)), n, k));
  }
}

export function getSignatureAlgorithmFullName(
  certificateData: CertificateData,
  signatureAlgorithm: string,
  hashAlgorithm: string,
): string {
  const { publicKeyDetails } = certificateData;
  if (signatureAlgorithm === 'ecdsa') {
    return `${signatureAlgorithm}_${hashAlgorithm}_${(publicKeyDetails as PublicKeyDetailsECDSA).curve}_${publicKeyDetails.bits}`;
  } else {
    const { exponent } = publicKeyDetails as PublicKeyDetailsRSA;
    return `${signatureAlgorithm}_${hashAlgorithm}_${exponent}_${publicKeyDetails.bits}`;
  }
}

export function getNAndK(sigAlg: SignatureAlgorithm) {
  if (sigAlg === 'rsa_sha256_65537_3072') {
    return { n: n_dsc_3072, k: k_dsc };
  }

  if (sigAlg.startsWith('ecdsa_')) {
    if (sigAlg.endsWith('224')) {
      return { n: 32, k: 7 };
    } else if (sigAlg.endsWith('256')) {
      return { n: n_dsc_ecdsa, k: 4 };
    } else if (sigAlg.endsWith('384')) {
      return { n: n_dsc_ecdsa, k: 6 };
    } else if (sigAlg.endsWith('512')) {
      return { n: n_dsc_ecdsa, k: 8 };
    } else if (sigAlg.endsWith('521')) {
      return { n: 66, k: 8 };
    } else {
      throw new Error('invalid key size');
    }
  }

  if (sigAlg.startsWith('rsapss_')) {
    const keyLength = parseInt(sigAlg.split('_')[3]);

    if (keyLength === 3072) {
      return { n: n_dsc_3072, k: k_dsc_3072 };
    }

    if (keyLength === 4096) {
      return { n: n_dsc_4096, k: k_dsc_4096 };
    }
    return { n: n_dsc, k: k_dsc };
  }

  if (sigAlg === 'rsa_sha256_65537_4096' || sigAlg === 'rsa_sha512_65537_4096') {
    return { n: n_dsc_4096, k: k_dsc_4096 };
  }

  return { n: n_dsc, k: k_dsc };
}

export function getNAndKCSCA(sigAlg: 'rsa' | 'ecdsa' | 'rsapss') {
  const n = sigAlg === 'ecdsa' ? n_dsc_ecdsa : n_csca;
  const k = sigAlg === 'ecdsa' ? k_dsc_ecdsa : k_csca;
  return { n, k };
}
