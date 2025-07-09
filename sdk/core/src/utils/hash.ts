import { ethers } from 'ethers';

/**
 * Generates a deterministic user identifier hash from the provided context data.
 *
 * The function computes a SHA-256 hash of the input buffer, then applies a RIPEMD-160 hash to the result. The final output is a hexadecimal string, left-padded with zeros to 40 characters and prefixed with "0x".
 *
 * @param userContextData - The buffer containing user context data to hash
 * @returns A 40-character hexadecimal user identifier string prefixed with "0x"
 */
export function calculateUserIdentifierHash(userContextData: Buffer): string {
  const sha256Hash = ethers.sha256(userContextData);
  const ripemdHash = ethers.ripemd160(sha256Hash);
  return ripemdHash.toString().padStart(40, '0');
}
