import type { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';

import {
  AUTHORIZATION_URL,
  DEFAULT_VERIFY_SERVICE,
  JWKS_URL,
  TOKEN_URL,
  getEnvOrThrow,
} from './constants.js';

export interface SelfProfile {
  sub: string;
  iss: string;
  aud: string;
  self: {
    attestation_id: number;
    verified: boolean;
    claims: Record<string, unknown>;
  };
}

export interface SelfProviderOptions extends Partial<OAuthUserConfig<SelfProfile>> {
  verifyServiceUrl?: string;
}

export function SelfProvider(options: SelfProviderOptions = {}): OAuthConfig<SelfProfile> {
  const baseUrl = options.verifyServiceUrl || DEFAULT_VERIFY_SERVICE;

  return {
    id: 'self',
    name: 'Self',
    type: 'oauth',
    clientId: options.clientId || getEnvOrThrow('SELF_APP_ID'),
    clientSecret: options.clientSecret || getEnvOrThrow('SELF_CLIENT_SECRET'),
    authorization: {
      url: `${baseUrl}${AUTHORIZATION_URL}`,
      params: {
        response_type: 'code',
        code_challenge_method: 'S256',
      },
    },
    token: `${baseUrl}${TOKEN_URL}`,
    jwks_endpoint: `${baseUrl}${JWKS_URL}`,
    checks: ['pkce', 'state'] as ('pkce' | 'state')[],
    profile(profile: SelfProfile) {
      return {
        id: profile.sub,
        name: undefined,
        email: undefined,
        image: undefined,
        verified: profile.self?.verified ?? false,
        claims: profile.self?.claims ?? {},
        attestationId: profile.self?.attestation_id,
      };
    },
  } satisfies OAuthConfig<SelfProfile>;
}
