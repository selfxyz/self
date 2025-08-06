import { API_URL, API_URL_STAGING } from '../constants/constants.js';
import { SKI_PEM, SKI_PEM_DEV } from '../constants/skiPem.js';

export function findOIDPosition(
  oid: string,
  message: number[]
): { oid_index: number; oid_length: number } {
  // Convert OID string like "1.2.840.113549" to byte array
  const oidParts = oid.split('.').map(Number);

  // First byte is 40 * first number + second number
  const oidBytes = [40 * oidParts[0] + oidParts[1]];

  // Convert remaining parts to ASN.1 DER encoding
  for (let i = 2; i < oidParts.length; i++) {
    let value = oidParts[i];
    const bytes = [];

    // Handle multi-byte values
    if (value >= 128) {
      const tempBytes = [];
      while (value > 0) {
        tempBytes.unshift(value & 0x7f);
        value = value >>> 7;
      }
      // Set MSB for all bytes except last
      for (let j = 0; j < tempBytes.length - 1; j++) {
        bytes.push(tempBytes[j] | 0x80);
      }
      bytes.push(tempBytes[tempBytes.length - 1]);
    } else {
      bytes.push(value);
    }
    oidBytes.push(...bytes);
  }

  console.log(
    '\x1b[33m%s\x1b[0m',
    'OID bytes (hex):',
    oidBytes.map((b) => b.toString(16).padStart(2, '0')).join(' ')
  );

  // Search for OID in message
  // OID will be preceded by 0x06 (ASN.1 OID tag) and length byte
  for (let i = 0; i < message.length - oidBytes.length; i++) {
    if (message[i] === 0x06) {
      // OID tag
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
          const result = {
            oid_index: i,
            oid_length: len + 2, // Add 2 for tag and length bytes
          };
          console.log('\x1b[32m%s\x1b[0m', 'Found OID at:', result); // Green color
          return result;
        }
      }
    }
  }

  throw new Error('OID not found in message');
}

// @returns [startIndex, length] where startIndex is the index of the first byte of the modulus in the message and length is the length of the modulus in bytes
export function findStartIndex(modulus: string, messagePaddedNumber: number[]): [number, number] {
  const modulusNumArray = [];
  for (let i = 0; i < modulus.length; i += 2) {
    const hexPair = modulus.slice(i, i + 2);
    const number = parseInt(hexPair, 16);
    modulusNumArray.push(number);
  }

  // console.log('Modulus length:', modulusNumArray.length);
  // console.log('Message length:', messagePaddedNumber.length);
  // console.log('Modulus (hex):', modulusNumArray.map(n => n.toString(16).padStart(2, '0')).join(''));
  // console.log('Message (hex):', messagePaddedNumber.map(n => n.toString(16).padStart(2, '0')).join(''));

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

export function getCSCAFromSKI(ski: string, skiPem: any = null): string {
  const normalizedSki = ski.replace(/\s+/g, '').toLowerCase();
  const isSkiProvided = skiPem !== null;
  console.log('SKI-PEM provided');
  const cscaPemPROD = (SKI_PEM as any)[normalizedSki];
  const cscaPemDEV = (SKI_PEM_DEV as any)[normalizedSki];
  let cscaPem = null;
  if (isSkiProvided) {
    cscaPem = skiPem[normalizedSki];
  } else {
    cscaPem = cscaPemDEV || cscaPemPROD;
  }
  if (!cscaPem) {
    console.log(
      '\x1b[33m%s\x1b[0m',
      `[WRN] CSCA with SKI ${ski} not found`,
      'isSkiProvided: ',
      isSkiProvided
    );
    throw new Error(
      `CSCA not found, authorityKeyIdentifier: ${ski}, isSkiProvided: ${isSkiProvided}`
    );
  }
  if (!cscaPem.includes('-----BEGIN CERTIFICATE-----')) {
    cscaPem = `-----BEGIN CERTIFICATE-----\n${cscaPem}\n-----END CERTIFICATE-----`;
  }
  return cscaPem;
}

export async function getSKIPEM(
  environment: 'staging' | 'production'
): Promise<{ [key: string]: string }> {
  const skiPemUrl = (environment === 'staging' ? API_URL_STAGING : API_URL) + '/ski-pem';
  console.log('Fetching SKI-PEM mapping from:', skiPemUrl);
  try {
    const response = await fetch(skiPemUrl);
    if (!response.ok) {
      throw new Error(`HTTP error fetching ${skiPemUrl}! status: ${response.status}`);
    }

    const responseText = await response.text();
    const jsonData = JSON.parse(responseText);

    if (
      !jsonData ||
      typeof jsonData !== 'object' ||
      !jsonData.data ||
      typeof jsonData.data !== 'object'
    ) {
      console.error('Unexpected JSON structure received:', jsonData);
      throw new Error('Unexpected JSON structure received from SKI-PEM endpoint.');
    }

    console.log('Parsed SKI-PEM data received.');

    return jsonData.data;
  } catch (error) {
    console.error('Error fetching or parsing ski-pem:', error);
    throw new Error(
      `Failed to get SKIPEM: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
