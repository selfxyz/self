/**
 * Generates a deterministic user identifier hash from the provided context data using the
 * Web Crypto API. This implementation works seamlessly in both browsers and modern versions
 * of Node.js that expose the Web Crypto API (v20+).
 *
 * The function computes the SHA-256 digest of the input string and returns the raw bytes as a
 * Uint8Array.
 *
 * @param input - The string to hash.
 * @returns A promise that resolves to a Uint8Array containing the 32-byte SHA-256 digest.
 */
export async function calculateUserIdentifierHash(input: string): Promise<Uint8Array> {
  // TextEncoder encodes the string as UTF-8 bytes, matching previous Buffer.from(..., 'utf8') behaviour.
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}
