import { toUnsignedByte } from '../../foundation/bytes.js';

export function formatAndConcatenateDataHashes(
  dataHashes: [number, number[]][],
  dg1HashOffset: number,
) {
  const concat: number[] = [];

  const startingSequence = Array.from(
    { length: dg1HashOffset },
    () => Math.floor(Math.random() * 256) - 128,
  );

  concat.push(...startingSequence);

  for (const dataHash of dataHashes) {
    concat.push(...[0, 0, 0, 0, 0, 0, 0]);
    concat.push(...dataHash[1]);
  }

  return concat;
}

export function formatDG1Attribute(index: number[], value: string) {
  const max_length = index[1] - index[0] + 1;
  if (value.length > max_length) {
    throw new Error(
      `Value is too long for index ${index[0]}-${index[1]} value: ${value} value.length: ${value.length} maxLength: ${max_length}`,
    );
  }
  return value.padEnd(max_length, '<');
}

export function formatDg2Hash(dg2Hash: number[]) {
  const unsignedBytesDg2Hash = dg2Hash.map(x => toUnsignedByte(x));
  while (unsignedBytesDg2Hash.length < 64) {
    unsignedBytesDg2Hash.push(0);
  }
  return unsignedBytesDg2Hash;
}

export function formatMrz(mrz: string) {
  const mrzCharcodes = [...mrz].map(char => char.charCodeAt(0));

  if (mrz.length === 88) {
    mrzCharcodes.unshift(88);
    mrzCharcodes.unshift(95, 31);
    mrzCharcodes.unshift(91);
    mrzCharcodes.unshift(97);
  } else if (mrz.length === 90) {
    mrzCharcodes.unshift(90);
    mrzCharcodes.unshift(95, 31);
    mrzCharcodes.unshift(93);
    mrzCharcodes.unshift(97);
  } else {
    throw new Error(`Unsupported MRZ length: ${mrz.length}. Expected 88 or 90 characters.`);
  }

  return mrzCharcodes;
}

export function formatName(firstName: string, lastName: string, targetLength: number) {
  const formattedLastName = lastName.toUpperCase().split(' ').join('<');
  const formattedFirstName = firstName.toUpperCase().split(' ').join('<');

  let result = `${formattedLastName}<<${formattedFirstName}`;

  if (result.length < targetLength) {
    result = result.padEnd(targetLength, '<');
  } else if (result.length > targetLength) {
    result = result.substring(0, targetLength);
  }

  return result;
}

export function generateSignedAttr(messageDigest: number[]) {
  const constructedEContent: number[] = [];

  constructedEContent.push(...[49, 102]);

  // 1.2.840.113549.1.9.3 is RFC_3369_CONTENT_TYPE_OID
  constructedEContent.push(...[48, 21, 6, 9, 42, -122, 72, -122, -9, 13, 1, 9, 3]);
  // 2.23.136.1.1.1 is ldsSecurityObject
  constructedEContent.push(...[49, 8, 6, 6, 103, -127, 8, 1, 1, 1]);

  // 1.2.840.113549.1.9.5 is signing-time
  constructedEContent.push(...[48, 28, 6, 9, 42, -122, 72, -122, -9, 13, 1, 9, 5]);
  // mock time of signature
  constructedEContent.push(...[49, 15, 23, 13, 49, 57, 49, 50, 49, 54, 49, 55, 50, 50, 51, 56, 90]);
  // 1.2.840.113549.1.9.4 is RFC_3369_MESSAGE_DIGEST_OID
  constructedEContent.push(...[48, 47, 6, 9, 42, -122, 72, -122, -9, 13, 1, 9, 4]);
  // TAG and length of the message digest
  constructedEContent.push(...[49, 34, 4, 32]);

  constructedEContent.push(...messageDigest);
  return constructedEContent;
}
