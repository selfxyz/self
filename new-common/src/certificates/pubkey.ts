import { hexToDecimal, splitToWords } from '../foundation/bytes.js';
import type {
  CertificateData,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
} from '../foundation/types/certificate.js';
import type { SignatureAlgorithm } from '../foundation/types/document.js';
import { getNAndK, getSignatureAlgorithmFullName } from './signature.js';

export function getCertificatePubKey(
  certificateData: CertificateData,
  signatureAlgorithm: string,
  hashFunction: string,
): string[] {
  const signatureAlgorithmFullName = getSignatureAlgorithmFullName(
    certificateData,
    signatureAlgorithm,
    hashFunction,
  );
  const { n, k } = getNAndK(signatureAlgorithmFullName as SignatureAlgorithm);
  const { publicKeyDetails } = certificateData;
  if (signatureAlgorithm === 'ecdsa') {
    const { x, y } = publicKeyDetails as PublicKeyDetailsECDSA;
    const x_dsc = splitToWords(BigInt(hexToDecimal(x)), n, k);
    const y_dsc = splitToWords(BigInt(hexToDecimal(y)), n, k);
    return [...x_dsc, ...y_dsc];
  } else {
    const { modulus } = publicKeyDetails as PublicKeyDetailsRSA;
    return splitToWords(BigInt(hexToDecimal(modulus)), n, k);
  }
}

export function formatCertificatePubKeyDSC(
  certificateData: CertificateData,
  signatureAlgorithm: string,
): string[] {
  const { publicKeyDetails } = certificateData;
  if (signatureAlgorithm === 'ecdsa') {
    const { x, y } = publicKeyDetails as PublicKeyDetailsECDSA;
    const fullPubKey = x + y;
    return splitToWords(BigInt(hexToDecimal(fullPubKey)), 8, 525);
  } else {
    const { modulus } = publicKeyDetails as PublicKeyDetailsRSA;
    return splitToWords(BigInt(hexToDecimal(modulus)), 8, 525);
  }
}

export function findStartPubKeyIndex(
  certificateData: CertificateData,
  rawCert: number[],
  signatureAlgorithm: string,
): [number, number] {
  const { publicKeyDetails } = certificateData;
  if (signatureAlgorithm === 'ecdsa') {
    const { x, y } = publicKeyDetails as PublicKeyDetailsECDSA;
    const [x_index, x_totalLength] = findStartIndexEC(x, rawCert);
    const [y_index, y_totalLength] = findStartIndexEC(y, rawCert);
    return [x_index, x_totalLength + y_totalLength];
  } else {
    const { modulus } = publicKeyDetails as PublicKeyDetailsRSA;
    return findStartIndex(modulus, rawCert);
  }
}

export function findStartIndex(modulus: string, messagePaddedNumber: number[]): [number, number] {
  const modulusNumArray = [];
  for (let i = 0; i < modulus.length; i += 2) {
    const hexPair = modulus.slice(i, i + 2);
    const number = parseInt(hexPair, 16);
    modulusNumArray.push(number);
  }

  for (let i = 0; i < messagePaddedNumber.length - modulusNumArray.length + 1; i++) {
    let matched = true;
    for (let j = 0; j < modulusNumArray.length; j++) {
      if (modulusNumArray[j] !== messagePaddedNumber[i + j]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return [i, modulusNumArray.length];
    }
  }

  throw new Error('DSC Pubkey not found in certificate');
}

export function findStartIndexEC(point: string, messagePadded: number[]): [number, number] {
  const pointNumArray = [];
  for (let i = 0; i < point.length; i += 2) {
    pointNumArray.push(parseInt(point.slice(i, i + 2), 16));
  }

  let startIndex = -1;

  for (let i = 0; i < messagePadded.length - pointNumArray.length + 1; i++) {
    const isMatch = pointNumArray.every((byte, j) => messagePadded[i + j] === byte);
    if (isMatch) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    throw new Error('DSC Pubkey not found in CSCA certificate');
  }
  return [startIndex, pointNumArray.length];
}

export function findOIDPosition(
  oid: string,
  message: number[],
): { oid_index: number; oid_length: number } {
  const oidParts = oid.split('.').map(Number);
  const oidBytes = [40 * oidParts[0] + oidParts[1]];

  for (let i = 2; i < oidParts.length; i++) {
    let value = oidParts[i];
    const bytes: number[] = [];

    if (value >= 128) {
      const tempBytes: number[] = [];
      while (value > 0) {
        tempBytes.unshift(value & 0x7f);
        value = value >>> 7;
      }
      for (let j = 0; j < tempBytes.length - 1; j++) {
        bytes.push(tempBytes[j] | 0x80);
      }
      bytes.push(tempBytes[tempBytes.length - 1]);
    } else {
      bytes.push(value);
    }
    oidBytes.push(...bytes);
  }

  for (let i = 0; i < message.length - oidBytes.length; i++) {
    if (message[i] === 0x06) {
      const len = message[i + 1];
      if (len === oidBytes.length) {
        let found = true;
        for (let j = 0; j < len; j++) {
          if (message[i + 2 + j] !== oidBytes[j]) {
            found = false;
            break;
          }
        }
        if (found) {
          return {
            oid_index: i,
            oid_length: len + 2,
          };
        }
      }
    }
  }

  throw new Error('OID not found in message');
}
