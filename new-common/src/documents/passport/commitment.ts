import { poseidon5 } from 'poseidon-lite';

import { hash, packBytesAndPoseidon } from '../../crypto/hash/index.js';
import { bytesToBigDecimal, hexToDecimal, splitToWords } from '../../foundation/bytes.js';
import type { CertificateData } from '../../foundation/types/certificate.js';
import type { PassportData, SignatureAlgorithm } from '../../foundation/types/document.js';
import {
  extractRSFromSignature,
  getNAndK,
  getSignatureAlgorithmFullName,
} from '../../certificates/signature.js';
import { getCertificatePubKey } from '../../certificates/pubkey.js';
import { getLeafDscTree } from '../../trees/index.js';
import { formatMrz } from './format.js';

export function generateCommitment(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
) {
  const passportMetadata = passportData.passportMetadata!;

  const dg1_packed_hash = packBytesAndPoseidon(formatMrz(passportData.mrz));

  const eContent_shaBytes = hash(
    passportMetadata.eContentHashFunction,
    Array.from(passportData.eContent),
    'bytes',
  );

  const eContent_packed_hash = packBytesAndPoseidon(
    (eContent_shaBytes as number[]).map(byte => byte & 0xff),
  );

  const dsc_hash = getLeafDscTree(passportData.dsc_parsed!, passportData.csca_parsed!);

  return poseidon5([
    secret,
    attestation_id,
    dg1_packed_hash,
    eContent_packed_hash,
    dsc_hash,
  ]).toString();
}

function getPassportSignature(passportData: PassportData, n: number, k: number): any {
  const { signatureAlgorithm } = passportData.dsc_parsed!;
  if (signatureAlgorithm === 'ecdsa') {
    const { r, s } = extractRSFromSignature(passportData.encryptedDigest);
    const signature_r = splitToWords(BigInt(hexToDecimal(r)), n, k);
    const signature_s = splitToWords(BigInt(hexToDecimal(s)), n, k);
    return [...signature_r, ...signature_s];
  } else {
    return splitToWords(BigInt(bytesToBigDecimal(passportData.encryptedDigest)), n, k);
  }
}

export function getPassportSignatureInfos(passportData: PassportData) {
  const passportMetadata = passportData.passportMetadata!;
  const signatureAlgorithmFullName = getSignatureAlgorithmFullName(
    passportData.dsc_parsed!,
    passportMetadata.signatureAlgorithm,
    passportMetadata.signedAttrHashFunction,
  );
  const { n, k } = getNAndK(signatureAlgorithmFullName as SignatureAlgorithm);

  return {
    pubKey: getCertificatePubKey(
      passportData.dsc_parsed!,
      passportMetadata.signatureAlgorithm,
      passportMetadata.signedAttrHashFunction,
    ),
    signature: getPassportSignature(passportData, n, k),
    signatureAlgorithmFullName,
  };
}

export function generateNullifier(passportData: PassportData) {
  const signedAttr_shaBytes = hash(
    passportData.passportMetadata!.signedAttrHashFunction,
    Array.from(passportData.signedAttr),
    'bytes',
  );
  return packBytesAndPoseidon((signedAttr_shaBytes as number[]).map(byte => byte & 0xff));
}
