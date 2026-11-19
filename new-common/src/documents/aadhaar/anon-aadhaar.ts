/*
 * Except for Uint8ArrayToCharArray, the functions in this file are copied from
 * @anon-aadhaar/core (https://github.com/anon-aadhaar/anon-aadhaar,
 * packages/core), so that this package does not depend on it at runtime.
 *
 * MIT License
 *
 * Copyright (c) 2022 Ethereum Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import pako from 'pako';

export enum IdFields {
  'Email_mobile_present_bit_indicator_value',
  'ReferenceId',
  'Name',
  'DOB',
  'Gender',
  'CareOf',
  'District',
  'Landmark',
  'House',
  'Location',
  'PinCode',
  'PostOffice',
  'State',
  'Street',
  'SubDistrict',
  'VTC',
  'PhoneNumberLast4',
}

export function Uint8ArrayToCharArray(a: Uint8Array): string[] {
  return Array.from(a).map(x => x.toString());
}

export function convertBigIntToByteArray(bigInt: bigint) {
  const byteLength = Math.max(1, Math.ceil(bigInt.toString(2).length / 8));

  const result = new Uint8Array(byteLength);
  let i = 0;
  while (bigInt > 0) {
    result[i] = Number(bigInt % BigInt(256));
    bigInt = bigInt / BigInt(256);
    i += 1;
  }
  return result.reverse();
}

export function decompressByteArray(byteArray: Uint8Array) {
  return pako.inflate(byteArray);
}

// Extract photo from startIndex (18th delimiter) to end including the padding
export function extractPhoto(qrDataPadded: number[], dataLength: number) {
  let begin = 0;
  for (let i = 0; i < 18; ++i) {
    begin = qrDataPadded.indexOf(255, begin + 1);
  }

  return {
    begin,
    dataLength,
    bytes: qrDataPadded.slice(begin + 1, dataLength),
  };
}

export function getEndIndex(byteArray: Uint8Array): number {
  let countDelimiter = 0;
  let endIndex = 0;
  for (let i = 0; i < byteArray.length; i++) {
    if (countDelimiter < 16) {
      if (byteArray[i] !== 255) {
        continue;
      } else {
        countDelimiter += 1;
      }
    } else {
      endIndex = i;
      break;
    }
  }

  return endIndex;
}

// This function is not cryptographically secure.
// It is only used to generate a fake photo when updating test data.
export function getRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

export function rawDataToCompressedQR(data: Uint8Array): bigint {
  const compressed = new Uint8Array(pako.deflate(data));
  let result = BigInt(0);
  for (let i = 0; i < compressed.length; i++) {
    result = result * BigInt(256) + BigInt(compressed[i]);
  }
  return result;
}

export function replaceBytesBetween(
  arr: Uint8Array,
  replaceWith: Uint8Array,
  start: number,
  end: number,
): Uint8Array {
  if (start < 0 || end >= arr.length || start > end) {
    console.error('Invalid start or end index.');
    return arr;
  }

  const before = arr.subarray(0, start);
  const after = arr.subarray(end + 1);

  const result = new Uint8Array(before.length + replaceWith.length + after.length);

  result.set(before, 0);
  result.set(replaceWith, before.length);
  result.set(after, before.length + replaceWith.length);

  return result;
}

// Returns an object with all the ID fields in string format
export function returnFullId(signedData: Uint8Array) {
  const allDataParsed: number[][] = [];
  let countDelimiter = 0;
  let temp: number[] = [];
  for (let i = 0; i < signedData.length; i++) {
    if (countDelimiter < 18) {
      if (signedData[i] !== 255) {
        temp.push(signedData[i]);
      } else {
        countDelimiter += 1;
        allDataParsed.push(temp);
        temp = [];
      }
    }
  }

  const ID: { [key: string]: string } = {};
  for (let i = 0; i < allDataParsed.length; i++) {
    let result = '';
    for (let j = 0; j < allDataParsed[i].length; j++) {
      result += String.fromCharCode(allDataParsed[i][j]);
    }
    ID[IdFields[i - 1]] = result;
  }

  return ID;
}

export function splitToWords(number: bigint, wordsize: bigint, numberElement: bigint) {
  let t = number;
  const words: string[] = [];
  for (let i = BigInt(0); i < numberElement; ++i) {
    const baseTwo = BigInt(2);

    words.push(`${t % BigInt(Math.pow(Number(baseTwo), Number(wordsize)))}`);
    t = BigInt(t / BigInt(Math.pow(Number(BigInt(2)), Number(wordsize))));
  }
  if (!(t == BigInt(0))) {
    throw `Number ${number} does not fit in ${(wordsize * numberElement).toString()} bits`;
  }
  return words;
}
