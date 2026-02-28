/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth redirect flow.
 *
 * Uses SubtleCrypto for SHA-256 hashing (works in all modern browsers).
 * Generates S256 challenges per RFC 7636.
 */

/**
 * Base64url encode a Uint8Array (no padding).
 */
export function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a random code_verifier string (43 chars, base64url-encoded from 32 random bytes).
 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes); // 43 chars
}

/**
 * Compute the S256 code_challenge from a code_verifier.
 * code_challenge = BASE64URL(SHA256(code_verifier))
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}
