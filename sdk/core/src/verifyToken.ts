import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const DEFAULT_JWKS_URL = 'https://verify.self.xyz/.well-known/jwks.json';

export interface SelfTokenClaims {
  attestation_id: number;
  verified: boolean;
  claims: Record<string, unknown>;
  error?: string;
}

export interface SelfTokenPayload extends JWTPayload {
  self: SelfTokenClaims;
}

export interface VerifyTokenResult {
  verified: boolean;
  claims: Record<string, unknown>;
  attestationId: number;
  subject: string;
  audience: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface VerifyTokenOptions {
  jwksUrl?: string;
  audience?: string;
}

/**
 * Validates a JWT issued by the Self verify-service (token mode).
 *
 * @param token - The JWT string from the self:success event
 * @param options - Optional configuration
 * @returns Verified token payload
 * @throws If the token is invalid, expired, or signature doesn't match
 */
export async function verifyToken(
  token: string,
  options: VerifyTokenOptions = {}
): Promise<VerifyTokenResult> {
  const jwksUrl = options.jwksUrl || DEFAULT_JWKS_URL;
  const JWKS = createRemoteJWKSet(new URL(jwksUrl));

  const verifyOptions: Parameters<typeof jwtVerify>[2] = {
    issuer: 'verify.self.xyz',
    algorithms: ['EdDSA'],
  };

  if (options.audience) {
    verifyOptions.audience = options.audience;
  }

  const { payload } = await jwtVerify(token, JWKS, verifyOptions);
  const selfPayload = payload as SelfTokenPayload;

  if (!selfPayload.self) {
    throw new Error('Invalid Self token: missing "self" claim');
  }

  return {
    verified: selfPayload.self.verified,
    claims: selfPayload.self.claims || {},
    attestationId: selfPayload.self.attestation_id,
    subject: selfPayload.sub || '',
    audience: typeof selfPayload.aud === 'string' ? selfPayload.aud : (selfPayload.aud?.[0] || ''),
    issuedAt: new Date((selfPayload.iat || 0) * 1000),
    expiresAt: new Date((selfPayload.exp || 0) * 1000),
  };
}
