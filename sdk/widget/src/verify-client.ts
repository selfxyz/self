/**
 * Minimal Ed25519 JWT verifier using SubtleCrypto.
 *
 * Verifies JWTs issued by verify.self.xyz without importing jose.
 * Requires browser support for Ed25519 in SubtleCrypto:
 *   Chrome 113+, Safari 17+, Firefox 128+
 *
 * TODO: fallback to dynamic import('jose') CDN for broader browser compat
 */

const DEFAULT_JWKS_URL = 'https://verify.self.xyz/.well-known/jwks.json';
const DEFAULT_ISSUER = 'verify.self.xyz';

interface JWK {
  kty: string;
  crv: string;
  x: string;
  kid?: string;
  alg?: string;
  use?: string;
}

interface JWTHeader {
  alg: string;
  kid?: string;
}

export interface VerifyTokenResult {
  verified: boolean;
  claims?: Record<string, unknown>;
  error?: string;
}

// Cache: JWKS URL -> { key, fetchedAt }
const keyCache = new Map<string, { key: CryptoKey; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function base64urlDecode(str: string): Uint8Array {
  // Pad to multiple of 4
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJWTPayload(token: string): { header: JWTHeader; payload: Record<string, unknown>; signatureInput: Uint8Array; signature: Uint8Array } {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const header = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[0]))) as JWTHeader;
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1]))) as Record<string, unknown>;
  const signatureInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64urlDecode(parts[2]);

  return { header, payload, signatureInput, signature };
}

async function fetchPublicKey(jwksUrl: string, kid?: string): Promise<CryptoKey> {
  const cacheKey = `${jwksUrl}::${kid || 'default'}`;
  const cached = keyCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.key;
  }

  const res = await fetch(jwksUrl);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);

  const jwks = (await res.json()) as { keys: JWK[] };
  const jwk = kid
    ? jwks.keys.find((k) => k.kid === kid)
    : jwks.keys.find((k) => k.alg === 'EdDSA' || k.crv === 'Ed25519');

  if (!jwk) throw new Error('No matching Ed25519 key found in JWKS');

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x },
    { name: 'Ed25519' },
    false,
    ['verify'],
  );

  keyCache.set(cacheKey, { key, fetchedAt: Date.now() });
  return key;
}

/**
 * Verify a JWT issued by verify.self.xyz using browser SubtleCrypto (Ed25519).
 *
 * Security note: This verifies the JWT signature and expiry. The trust model is
 * that verify-service performed the ZK proof verification correctly. The JWT is
 * cryptographically signed and cannot be forged without the private key.
 *
 * For high-security use cases (financial, legal), use server-side validation.
 * For age gates, proof-of-humanity, access control, client-side is sufficient.
 */
export async function verifyToken(
  token: string,
  options: { jwksUrl?: string; issuer?: string; audience?: string } = {},
): Promise<VerifyTokenResult> {
  const jwksUrl = options.jwksUrl || DEFAULT_JWKS_URL;
  const issuer = options.issuer || DEFAULT_ISSUER;
  const audience = options.audience;

  try {
    const { header, payload, signatureInput, signature } = decodeJWTPayload(token);

    if (header.alg !== 'EdDSA') {
      return { verified: false, error: `Unsupported algorithm: ${header.alg}` };
    }

    // Require and check expiry
    const exp = payload.exp as number | undefined;
    if (!exp) {
      return { verified: false, error: 'Missing exp claim' };
    }
    if (exp < Math.floor(Date.now() / 1000)) {
      return { verified: false, error: 'Token expired' };
    }

    // Require and check issuer
    const iss = payload.iss as string | undefined;
    if (!iss) {
      return { verified: false, error: 'Missing iss claim' };
    }
    if (iss !== issuer) {
      return { verified: false, error: `Invalid issuer: ${iss}` };
    }

    // Check audience if provided
    if (audience) {
      const aud = payload.aud as string | string[] | undefined;
      const audList = Array.isArray(aud) ? aud : aud ? [aud] : [];
      if (!audList.includes(audience)) {
        return { verified: false, error: `Invalid audience: ${aud}` };
      }
    }

    // Check payload.self.verified is not explicitly false
    const selfClaims = payload.self as Record<string, unknown> | undefined;
    if (selfClaims && selfClaims.verified === false) {
      return { verified: false, error: 'Token carries failed verification status' };
    }

    // Fetch public key and verify signature
    const publicKey = await fetchPublicKey(jwksUrl, header.kid);
    const valid = await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      signature as unknown as ArrayBuffer,
      signatureInput as unknown as ArrayBuffer,
    );

    if (!valid) {
      return { verified: false, error: 'Invalid signature' };
    }

    return {
      verified: true,
      claims: {
        sub: payload.sub,
        aud: payload.aud,
        iat: payload.iat,
        exp: payload.exp,
        ...(selfClaims || {}),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Detect unsupported Ed25519
    if (message.includes('NotSupportedError') || message.includes('Ed25519')) {
      return {
        verified: false,
        error: 'Ed25519 not supported in this browser. Requires Chrome 113+, Safari 17+, or Firefox 128+.',
      };
    }

    return { verified: false, error: message };
  }
}
