// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Safe TextDecoder factory that works across different JavaScript environments.
 * Handles browser, Node.js, and React Native environments gracefully.
 */
import { NfcParseError } from '../errors';

const createTextDecoder = (): TextDecoder => {
  // Browser environment - TextDecoder is available globally
  if (typeof globalThis !== 'undefined' && 'TextDecoder' in globalThis) {
    return new globalThis.TextDecoder('utf-8', { fatal: true });
  }

  // React Native environment - TextDecoder should be available on global
  if (
    typeof (globalThis as any).global !== 'undefined' &&
    (globalThis as any).global &&
    'TextDecoder' in (globalThis as any).global
  ) {
    return new ((globalThis as any).global as any).TextDecoder('utf-8', { fatal: true });
  }

  // Node.js environment - try to import from built-in `node:util` (only if we're in a Node.js context)
  if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process?.versions?.node) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const req = typeof require === 'function' ? require : undefined;
      const util = req ? req('node:util') : undefined;
      if (util?.TextDecoder) {
        return new util.TextDecoder('utf-8', { fatal: true });
      }
    } catch {
      // Fall through to error
    }
  }

  throw new NfcParseError(
    'TextDecoder not available in this environment. ' +
      'This SDK requires TextDecoder support which is available in modern browsers, Node.js, and React Native.',
  );
};

let DECODER: TextDecoder | undefined;

// Lazily initialize to avoid import-time failures in environments without a decoder.
const getDecoder = (): TextDecoder => {
  if (!DECODER) DECODER = createTextDecoder();
  return DECODER;
};

// Known LDS1 tag constants
const TAG_DG1 = 0x61;
const TAG_DG2 = 0x75;

/**
 * Data group 1 containing the Machine Readable Zone (MRZ) text from the
 * document. The MRZ string includes all personally identifiable information
 * and should be validated and encrypted before storage.
 */
export interface DG1 {
  mrz: string;
}

/**
 * Data group 2 containing the passport photo as JPEG or JPEG2000 bytes.
 * Callers handle compression, encryption, and storage of the image data.
 */
export interface DG2 {
  image: Uint8Array;
}

/**
 * Parsed NFC data from the document chip. Currently extracts DG1 (MRZ text)
 * and DG2 (photo). Additional data groups are ignored for forward compatibility.
 * Both fields are optional since the chip may omit data groups or the read may
 * fail partway through. Missing data groups typically indicate an incomplete
 * scan that should be retried.
 */
export interface ParsedNFCResponse {
  dg1?: DG1;
  dg2?: DG2;
}

function readLength(view: Uint8Array, offset: number): { length: number; next: number } {
  if (offset >= view.length) {
    throw new NfcParseError('Unexpected end of data while reading length');
  }
  const first = view[offset];
  if (first & 0x80) {
    const bytes = first & 0x7f;
    if (bytes === 0) {
      throw new NfcParseError('Indefinite length (0x80) not supported');
    }
    if (offset + bytes >= view.length) {
      throw new NfcParseError('Unexpected end of data while reading long-form length');
    }
    let len = 0;
    for (let j = 1; j <= bytes; j++) {
      len = (len << 8) | view[offset + j];
    }
    return { length: len, next: offset + 1 + bytes };
  }
  return { length: first, next: offset + 1 };
}

/**
 * Parse raw NFC chip bytes into DG1/DG2 structures.
 */
export function parseNFCResponse(bytes: Uint8Array): ParsedNFCResponse {
  const result: ParsedNFCResponse = {};
  let i = 0;
  while (i < bytes.length) {
    const tag = bytes[i++];
    if (i >= bytes.length) throw new NfcParseError('Unexpected end of data');
    const { length, next } = readLength(bytes, i);
    i = next;
    if (i + length > bytes.length) throw new NfcParseError('Unexpected end of data');
    const value = bytes.slice(i, i + length);
    i += length;

    switch (tag) {
      case TAG_DG1: {
        result.dg1 = { mrz: getDecoder().decode(value) };
        break;
      }
      case TAG_DG2: {
        result.dg2 = { image: value };
        break;
      }
      default: {
        // ignore unknown tags for forward-compatibility
        break;
      }
    }
  }
  return result;
}
