/**
 * Generates a deterministic user identifier hash from the provided context data using the
 * Web Crypto API. This implementation works seamlessly in both browsers and modern versions
 * of Node.js that expose the Web Crypto API (v20+).
 *
 * The function computes the SHA-256 digest of the input string and returns the raw bytes as a
 * Uint8Array.
 *
 * @param input - The hex string (with or without 0x prefix) representing the user context data to hash.
 * @returns A promise that resolves to a 40-character hexadecimal string (prefixed with 0x)
 */
import { ethers } from 'ethers';

export async function calculateUserIdentifierHash(input: string): Promise<string> {
  // Interpret the input as a hex string (with or without 0x prefix) and convert to bytes.
  const normalized = input.startsWith('0x') ? input : '0x' + input;
  const data = ethers.getBytes(normalized);

  // Compute its SHA-256 digest using the Web Crypto API.
  const sha256Digest = await crypto.subtle.digest('SHA-256', new Uint8Array(data));

  // Convert the SHA-256 digest (ArrayBuffer) to a 0x-prefixed hex string so it can be passed to
  // ethers.ripemd160, which expects a BytesLike/hex string input.
  const sha256Hex =
    '0x' + Array.from(new Uint8Array(sha256Digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  // Apply RIPEMD-160 to the SHA-256 output using ethers.js (browser-compatible implementation).
  const ripemdHex = ethers.ripemd160(sha256Hex);

  // Ensure the result is a 0x-prefixed 40-character hex string (42 chars including 0x).
  return ripemdHex.length === 42 ? ripemdHex : '0x' + ripemdHex.slice(2).padStart(40, '0');
}
