// @ts-ignore - ESLint incorrectly flags this as needing default import, but TypeScript definitions use named export
import { sha1 } from 'js-sha1';
import { sha224, sha256 } from 'js-sha256';
import { sha384, sha512 } from 'js-sha512';
import * as forge from 'node-forge';

import { hexToSignedBytes } from '../../foundation/bytes.js';

export function getHashLen(hashFunction: string) {
  switch (hashFunction) {
    case 'sha1':
      return 20;
    case 'sha224':
      return 28;
    case 'sha256':
      return 32;
    case 'sha384':
      return 48;
    case 'sha512':
      return 64;
    default:
      console.log(`${hashFunction} not found in getHashLen`);
      return 32;
  }
}

export function hash(
  hashFunction: string,
  bytesArray: number[],
  format: string = 'bytes'
): string | number[] {
  const unsignedBytesArray = bytesArray.map((byte) => byte & 0xff);
  let hashResult: string;

  switch (hashFunction) {
    case 'sha1':
      hashResult = sha1(unsignedBytesArray);
      break;
    case 'sha224':
      hashResult = sha224(unsignedBytesArray);
      break;
    case 'sha256':
      hashResult = sha256(unsignedBytesArray);
      break;
    case 'sha384':
      hashResult = sha384(unsignedBytesArray);
      break;
    case 'sha512':
      hashResult = sha512(unsignedBytesArray);
      break;
    default:
      console.log('\x1b[31m%s\x1b[0m', `${hashFunction} not found in hash`);
      hashResult = sha256(unsignedBytesArray);
  }
  if (format === 'hex') {
    return hashResult;
  }
  if (format === 'bytes') {
    return hexToSignedBytes(hashResult);
  }
  const actualForgeUtil = forge.util ? forge.util : (forge as any).default.util;
  if (format === 'binary') {
    return actualForgeUtil.binary.raw.encode(new Uint8Array(hexToSignedBytes(hashResult)));
  }
  throw new Error(`Invalid format: ${format}`);
}

export function forgeDigest(hashAlgorithm: string): forge.md.MessageDigest {
  const actualForge = forge.md ? forge : (forge as any).default;
  switch (hashAlgorithm) {
    case 'sha1':
      return actualForge.md.sha1.create();
    case 'sha256':
      return actualForge.md.sha256.create();
    case 'sha384':
      return actualForge.md.sha384.create();
    case 'sha512':
      return actualForge.md.sha512.create();
    default:
      throw new Error(`Unsupported hash algorithm: ${hashAlgorithm}`);
  }
}
