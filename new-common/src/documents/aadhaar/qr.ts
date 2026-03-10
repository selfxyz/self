import { convertBigIntToByteArray, decompressByteArray, extractPhoto } from '@anon-aadhaar/core';

import { shaPad } from '../../crypto/sha-pad.js';
import { packBytesAndPoseidon } from '../../crypto/hash/poseidon.js';
import type { ExtractedQRData } from '../../foundation/types/document.js';
import { extractQRDataFields } from './utils.js';

export interface ProcessedQRData {
  qrDataBytes: Uint8Array;
  decodedData: Uint8Array;
  signedData: Uint8Array;
  qrDataPadded: Uint8Array;
  qrDataPaddedLen: number;
  extractedFields: ExtractedQRData;
  qrHash: bigint;
  photo: { bytes: number[] };
  photoHash: bigint;
}

export function findDelimiterIndices(data: Uint8Array, count: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 255) {
      indices.push(i);
      if (indices.length === count) break;
    }
  }
  return indices;
}

export function findPhotoEOI(data: Uint8Array, startFrom: number): number {
  for (let i = startFrom; i < data.length - 1; i++) {
    if (data[i] === 255 && data[i + 1] === 217) {
      return i + 1;
    }
  }
  return 0;
}

export function extractSignatureBytes(decodedData: Uint8Array): Uint8Array {
  return decodedData.slice(decodedData.length - 256, decodedData.length);
}

export function processQRData(qrData: string): ProcessedQRData {
  const qrDataBytes = convertBigIntToByteArray(BigInt(qrData));
  const decodedData = decompressByteArray(qrDataBytes);
  const signedData = decodedData.slice(0, decodedData.length - 256);
  const [qrDataPaddedNumber, qrDataPaddedLen] = shaPad(Array.from(signedData), 512 * 3);
  const qrDataPadded = new Uint8Array(qrDataPaddedNumber);

  const photoEOI = findPhotoEOI(qrDataPadded, 0);
  if (photoEOI === 0) {
    throw new Error('Photo EOI not found');
  }

  const extractedFields = extractQRDataFields(qrDataBytes);

  // Calculate qrHash excluding timestamp (positions 9-25, 17 bytes)
  const qrDataWithoutTimestamp = [
    ...Array.from(qrDataPadded.slice(0, 9)),
    ...Array.from(qrDataPadded.slice(9, 26)).map(() => 0),
    ...Array.from(qrDataPadded.slice(26)),
  ];
  const qrHash = BigInt(packBytesAndPoseidon(qrDataWithoutTimestamp));

  const photo = extractPhoto(Array.from(qrDataPadded), photoEOI + 1);
  const photoHash = BigInt(packBytesAndPoseidon(photo.bytes.map(Number)));

  return {
    qrDataBytes,
    decodedData,
    signedData,
    qrDataPadded,
    qrDataPaddedLen,
    extractedFields,
    qrHash,
    photo,
    photoHash,
  };
}
