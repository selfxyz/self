import { randomBytes, createHash } from 'crypto';
import { verifyToken, type VerifyTokenResult } from '@selfxyz/core';

import {
  AUTHORIZATION_URL,
  DEFAULT_VERIFY_SERVICE,
  JWKS_URL,
  TOKEN_URL,
  getEnvOrThrow,
} from './constants.js';

export type { VerifyTokenResult } from '@selfxyz/core';

export interface SelfOAuthConfig {
  appId?: string;
  clientSecret?: string;
  redirectUri: string;
  verifyServiceUrl?: string;
}

export interface AuthorizationResult {
  url: string;
  state: string;
  codeVerifier: string;
}

export class SelfOAuth {
  private appId: string;
  private clientSecret: string;
  private redirectUri: string;
  private baseUrl: string;

  constructor(config: SelfOAuthConfig) {
    this.appId = config.appId || getEnvOrThrow('SELF_APP_ID');
    this.clientSecret = config.clientSecret || getEnvOrThrow('SELF_CLIENT_SECRET');
    this.redirectUri = config.redirectUri;
    this.baseUrl = config.verifyServiceUrl || DEFAULT_VERIFY_SERVICE;
  }

  /**
   * Generate an authorization URL with PKCE. Store the returned `state` and
   * `codeVerifier` in the user's session — you'll need them for `handleCallback()`.
   */
  getAuthorizationUrl(): AuthorizationResult {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const state = randomBytes(16).toString('base64url');

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      url: `${this.baseUrl}${AUTHORIZATION_URL}?${params.toString()}`,
      state,
      codeVerifier,
    };
  }

  /**
   * Exchange the authorization code for a verified token result.
   * Pass the `state` and `codeVerifier` from the session (stored during `getAuthorizationUrl()`).
   */
  async handleCallback(
    query: {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    },
    session: {
      state: string;
      codeVerifier: string;
    }
  ): Promise<VerifyTokenResult> {
    if (query.error) {
      throw new Error(`OAuth error: ${query.error} — ${query.error_description || ''}`);
    }

    if (!query.code) {
      throw new Error('Missing authorization code');
    }

    if (query.state !== session.state) {
      throw new Error('State mismatch — possible CSRF attack');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: query.code,
      redirect_uri: this.redirectUri,
      client_id: this.appId,
      client_secret: this.clientSecret,
      code_verifier: session.codeVerifier,
    });

    const res = await fetch(`${this.baseUrl}${TOKEN_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'unknown' }));
      throw new Error(`Token exchange failed: ${(err as Record<string, string>).error}`);
    }

    const tokenResponse = (await res.json()) as { access_token: string };

    return verifyToken(tokenResponse.access_token, {
      jwksUrl: `${this.baseUrl}${JWKS_URL}`,
    });
  }
}
