// Prefer the global TextDecoder; fall back to Node's util.TextDecoder at runtime.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TextDecoder may not exist on all globals
const getDecoder = (): TextDecoder => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - globalThis may not include TextDecoder in typings
  const TD =
    (typeof globalThis !== 'undefined' && (globalThis as any).TextDecoder) ||
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    (typeof require !== 'undefined'
      ? (() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require('util').TextDecoder;
          } catch {
            return undefined;
          }
        })()
      : undefined);
  if (!TD) throw new Error('TextDecoder not available in this environment');
  return new TD('utf-8', { fatal: true });
};

const DECODER = getDecoder();

// Known LDS1 tag constants
const TAG_DG1 = 0x61;
const TAG_DG2 = 0x75;

export interface DG1 {
  mrz: string;
}

export interface DG2 {
  image: Uint8Array;
}

export interface ParsedNFCResponse {
  dg1?: DG1;
  dg2?: DG2;
}

function readLength(view: Uint8Array, offset: number): { length: number; next: number } {
  if (offset >= view.length) {
    throw new Error('Unexpected end of data while reading length');
  }
  const first = view[offset];
  if (first & 0x80) {
    const bytes = first & 0x7f;
    if (bytes === 0) {
      throw new Error('Indefinite length (0x80) not supported');
    }
    if (offset + bytes >= view.length) {
      throw new Error('Unexpected end of data while reading long-form length');
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
    if (i >= bytes.length) throw new Error('Unexpected end of data');
    const { length, next } = readLength(bytes, i);
    i = next;
    if (i + length > bytes.length) throw new Error('Unexpected end of data');
    const value = bytes.slice(i, i + length);
    i += length;

    switch (tag) {
      case TAG_DG1: {
        result.dg1 = { mrz: DECODER.decode(value) };
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
