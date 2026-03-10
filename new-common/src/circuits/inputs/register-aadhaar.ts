import { Uint8ArrayToCharArray } from '@zk-email/helpers/dist/binary-format.js';
import { splitToWords } from '@anon-aadhaar/core';

import {
  processQRData,
  findDelimiterIndices,
  findPhotoEOI,
  extractSignatureBytes,
} from '../../documents/aadhaar/qr.js';
import { packBytesAndPoseidon } from '../../crypto/hash/poseidon.js';
import { stringToAsciiArray } from '../../documents/aadhaar/utils.js';
import { poseidon5 } from 'poseidon-lite';

export interface AadhaarRegisterInputOpts {
  pubKey: bigint;
  signature: bigint;
}

function computeNullifier(fields: {
  gender: string;
  yob: string;
  mob: string;
  dob: string;
  name: string;
  aadhaarLast4Digits: string;
}): bigint {
  const genderAscii = stringToAsciiArray(fields.gender)[0];
  const args = [
    genderAscii,
    ...stringToAsciiArray(fields.yob),
    ...stringToAsciiArray(fields.mob),
    ...stringToAsciiArray(fields.dob),
    ...stringToAsciiArray(fields.name.toUpperCase().padEnd(62, '\0')),
    ...stringToAsciiArray(fields.aadhaarLast4Digits),
  ];
  return BigInt(packBytesAndPoseidon(args));
}

function computePackedCommitment(fields: {
  pincode: string;
  state: string;
  phoneNoLast4Digits: string;
  name: string;
}): bigint {
  const args = [
    3,
    ...stringToAsciiArray(fields.pincode),
    ...stringToAsciiArray(fields.state.padEnd(31, '\0')),
    ...stringToAsciiArray(fields.phoneNoLast4Digits),
    ...stringToAsciiArray(fields.name.padEnd(62, '\0')),
  ];
  return BigInt(packBytesAndPoseidon(args));
}

export function generateAadhaarRegisterInputs(
  qrData: string,
  secret: string,
  opts: AadhaarRegisterInputOpts,
) {
  const processed = processQRData(qrData);

  const delimiterIndices = findDelimiterIndices(processed.qrDataPadded, 18);
  const photoEOI = findPhotoEOI(processed.qrDataPadded, delimiterIndices[17]);
  if (photoEOI === 0) {
    throw new Error('Photo EOI not found');
  }

  const nullifier = computeNullifier(processed.extractedFields);
  const packedCommitment = computePackedCommitment(processed.extractedFields);
  const commitment = poseidon5([
    BigInt(secret),
    processed.qrHash,
    nullifier,
    packedCommitment,
    processed.photoHash,
  ]);

  const inputs = {
    qrDataPadded: Uint8ArrayToCharArray(processed.qrDataPadded),
    qrDataPaddedLength: processed.qrDataPaddedLen,
    delimiterIndices,
    signature: splitToWords(opts.signature, BigInt(121), BigInt(17)),
    pubKey: splitToWords(opts.pubKey, BigInt(121), BigInt(17)),
    secret,
    photoEOI,
  };

  return { inputs, nullifier, commitment };
}
