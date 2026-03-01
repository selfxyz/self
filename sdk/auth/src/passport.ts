import { verifyToken, type VerifyTokenResult } from '@selfxyz/core';
import OAuth2Strategy from 'passport-oauth2';

import {
  AUTHORIZATION_URL,
  DEFAULT_VERIFY_SERVICE,
  JWKS_URL,
  TOKEN_URL,
  getEnvOrThrow,
} from './constants.js';

export interface SelfStrategyOptions {
  clientID?: string;
  clientSecret?: string;
  callbackURL: string;
  verifyServiceUrl?: string;
}

export type SelfVerifyCallback = (
  tokenResult: VerifyTokenResult,
  done: (err: Error | null, user?: unknown) => void
) => void | Promise<void>;

export class SelfStrategy extends OAuth2Strategy {
  name = 'self';

  constructor(options: SelfStrategyOptions, verify: SelfVerifyCallback) {
    const baseUrl = options.verifyServiceUrl || DEFAULT_VERIFY_SERVICE;
    const clientID = options.clientID || getEnvOrThrow('SELF_APP_ID');
    const clientSecret = options.clientSecret || getEnvOrThrow('SELF_CLIENT_SECRET');

    super(
      {
        authorizationURL: `${baseUrl}${AUTHORIZATION_URL}`,
        tokenURL: `${baseUrl}${TOKEN_URL}`,
        clientID,
        clientSecret,
        callbackURL: options.callbackURL,
        pkce: true,
        state: true,
      },
      // OAuth2Strategy calls verify(accessToken, refreshToken, profile, done)
      // We intercept to validate the JWT and pass structured result
      async (
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
        done: (err: Error | null, user?: unknown) => void
      ) => {
        try {
          const result = await verifyToken(accessToken, {
            jwksUrl: `${baseUrl}${JWKS_URL}`,
          });
          await verify(result, done);
        } catch (err) {
          done(err as Error);
        }
      }
    );
  }
}
