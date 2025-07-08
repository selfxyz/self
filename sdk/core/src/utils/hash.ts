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
  // Using ethers.js which works in both Node.js and browsers without Node built-ins
  // ethers.sha256 / ripemd160 return hex strings (prefixed with 0x)
  const sha256Hash = ethers.sha256(userContextData);
  const ripemdHash = ethers.ripemd160(sha256Hash);
  // Ensure the output matches the previous format: 0x + 40-character hex string
  return '0x' + ripemdHash.slice(2).padStart(40, '0');
}
