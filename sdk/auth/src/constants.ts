export const DEFAULT_VERIFY_SERVICE = 'https://verify.self.xyz';
export const AUTHORIZATION_URL = '/authorize';
export const TOKEN_URL = '/token';
export const JWKS_URL = '/.well-known/jwks.json';

export function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`@selfxyz/auth: Missing required environment variable ${name}`);
  }
  return value;
}
