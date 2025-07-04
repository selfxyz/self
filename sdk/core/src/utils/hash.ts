import { createHash } from 'crypto';

/**
 * Generates a deterministic user identifier hash from the provided context data.
 *
 * The function computes a SHA-256 hash of the input buffer, then applies a RIPEMD-160 hash to the result. The final output is a hexadecimal string, left-padded with zeros to 40 characters and prefixed with "0x".
 *
 * @param userContextData - The buffer containing user context data to hash
 * @returns A 40-character hexadecimal user identifier string prefixed with "0x"
 */
export function calculateUserIdentifierHash(userContextData: Buffer): string {
  const sha256Hash = createHash('sha256').update(userContextData).digest();
  const ripemdHash = createHash('ripemd160').update(sha256Hash).digest();
  return '0x' + ripemdHash.toString('hex').padStart(40, '0');
}
