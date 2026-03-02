import { convertBigIntToByteArray, decompressByteArray } from '@anon-aadhaar/core';

import type { ExtractedQRData } from '../../foundation/types/document.js';

const FIELD_POSITIONS = {
  NAME: 3,
  DOB: 4,
  GENDER: 5,
  PINCODE: 11,
  STATE: 13,
  PHONE_NO: 17,
} as const;

export function extractQRDataFields(qrData: string | Uint8Array): ExtractedQRData {
  const qrDataBytes =
    typeof qrData === 'string' ? convertBigIntToByteArray(BigInt(qrData)) : qrData;

  const decodedData = decompressByteArray(qrDataBytes);
  const signedData = decodedData.slice(0, decodedData.length - 256);

  const delimiterIndices: number[] = [];
  for (let i = 0; i < signedData.length; i++) {
    if (signedData[i] === 255) {
      delimiterIndices.push(i);
      if (delimiterIndices.length === 18) break;
    }
  }

  if (delimiterIndices.length < 18) {
    throw new Error(`Insufficient delimiters found: ${delimiterIndices.length}/18`);
  }

  const asciiToStr = (arr: number[]) =>
    arr
      .filter(b => b !== 0)
      .map(b => String.fromCharCode(b))
      .join('');

  const extractFieldData = (position: number): number[] => {
    const start = delimiterIndices[position - 1] + 1;
    const end = delimiterIndices[position];
    const result: number[] = [];
    for (let i = start; i < end; i++) result.push(signedData[i]);
    return result;
  };

  const aadhaarLast4Digits = asciiToStr([
    signedData[5],
    signedData[6],
    signedData[7],
    signedData[8],
  ]);

  const nameData = extractFieldData(FIELD_POSITIONS.NAME);
  const name = asciiToStr(nameData).trim();

  const dobData = extractFieldData(FIELD_POSITIONS.DOB);
  const dob = asciiToStr([dobData[0], dobData[1]]);
  const mob = asciiToStr([dobData[3], dobData[4]]);
  const yob = asciiToStr([dobData[6], dobData[7], dobData[8], dobData[9]]);

  const gender = asciiToStr(extractFieldData(FIELD_POSITIONS.GENDER));
  const pincode = asciiToStr(extractFieldData(FIELD_POSITIONS.PINCODE));
  const state = asciiToStr(extractFieldData(FIELD_POSITIONS.STATE)).trim();

  const phoneData = extractFieldData(FIELD_POSITIONS.PHONE_NO);
  const phoneNoLast4Digits = asciiToStr(phoneData.slice(phoneData.length - 4));

  const timestamp = [
    asciiToStr([signedData[9], signedData[10], signedData[11], signedData[12]]),
    '-',
    asciiToStr([signedData[13], signedData[14]]),
    '-',
    asciiToStr([signedData[15], signedData[16]]),
    ' ',
    asciiToStr([signedData[17], signedData[18]]),
    ':',
    asciiToStr([signedData[19], signedData[20]]),
  ].join('');

  return {
    name,
    yob,
    mob,
    dob,
    gender,
    pincode,
    state,
    aadhaarLast4Digits,
    phoneNoLast4Digits,
    timestamp,
  };
}

export function stringToAsciiArray(str: string) {
  return str.split('').map(char => char.charCodeAt(0));
}

export function getCurrentDate(): {
  currentYear: number;
  currentMonth: number;
  currentDay: number;
} {
  const now = new Date();
  return {
    currentYear: now.getUTCFullYear(),
    currentMonth: now.getUTCMonth() + 1,
    currentDay: now.getUTCDate(),
  };
}
