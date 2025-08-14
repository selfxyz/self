/**
 * Safe TextDecoder factory that works across different JavaScript environments.
 * Handles browser, Node.js, and React Native environments gracefully.
 */
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

  throw new Error(
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
