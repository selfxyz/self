import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getVerifiedClaims } from './sessions';

// Validated at runtime in authorize() — build-time check would crash Next.js static analysis
const SECRET = process.env.NEXTAUTH_SECRET;
if (!SECRET && process.env.NODE_ENV === 'production') {
  console.error('@selfxyz/self-verify-demo: NEXTAUTH_SECRET is required in production.');
}

/**
 * NextAuth config using a Credentials provider backed by server-side session
 * verification.
 *
 * The flow:
 * 1. Client calls POST /api/verify/session → server creates pending session
 * 2. Widget connects to websocket relayer, user completes verification in Self app
 * 3. Relayer delivers proof → widget fires self:success
 * 4. Client calls POST /api/verify/callback with sessionId + claims →
 *    server marks session as verified
 * 5. Client calls signIn('self-verify', { sessionId }) →
 *    authorize() checks the server-side session store and only mints a cookie
 *    if the session was verified server-side
 *
 * This means calling signIn() from the console with a fake sessionId will fail
 * because there is no matching verified session in the server store.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: 'self-verify',
      name: 'Self Verify',
      credentials: {
        sessionId: { type: 'text' },
      },
      async authorize(credentials) {
        if (!process.env.NEXTAUTH_SECRET) {
          console.error('NEXTAUTH_SECRET not set — refusing to create session');
          return null;
        }
        const sessionId = credentials?.sessionId as string | undefined;
        if (!sessionId) return null;

        // Only accept claims from server-verified sessions — not client input
        const claims = getVerifiedClaims(sessionId);
        if (!claims) return null;

        return {
          id: (claims.sub as string) || sessionId,
          name: claims.name as string | undefined,
          verified: true,
          claims,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.verified = true;
        token.claims = (user as Record<string, unknown>).claims;
      }
      return token;
    },
    session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = session as any;
      s.verified = token.verified;
      s.claims = token.claims;
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: SECRET || 'MISSING-SET-NEXTAUTH_SECRET',
});
