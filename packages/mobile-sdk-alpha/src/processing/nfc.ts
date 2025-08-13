import { TextDecoder } from 'util';

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
  let len = view[offset];
  if (len & 0x80) {
    const bytes = len & 0x7f;
    len = 0;
    for (let i = 1; i <= bytes; i++) {
      len = (len << 8) | view[offset + i];
    }
    return { length: len, next: offset + 1 + bytes };
  }
  return { length: len, next: offset + 1 };
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
      case 0x61: // DG1
        result.dg1 = { mrz: new TextDecoder().decode(value) };
        break;
      case 0x75: // DG2
        result.dg2 = { image: value };
        break;
      default:
        // ignore unknown tags
        break;
    }
  }
  return result;
}
