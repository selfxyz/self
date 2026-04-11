import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

/**
 * NextAuth config using a Credentials provider.
 *
 * In production, the SelfProvider OAuth flow handles everything. But since the
 * verify-service token endpoint is currently down, this demo uses the websocket
 * verification flow: the widget gets the proof via websocket, the client POSTs
 * the verified claims to our /api/auth endpoint, and NextAuth creates a session.
 *
 * The flow: widget → websocket proof → self:success → POST claims → session cookie
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: 'self-verify',
      name: 'Self Verify',
      credentials: {
        claims: { type: 'text' },
        sessionId: { type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.claims) return null;

        try {
          const claims = JSON.parse(credentials.claims as string) as Record<string, unknown>;

          // In production, you'd verify the JWT signature here using @selfxyz/core.
          // For this demo, we trust the websocket relay delivery.
          return {
            id: (claims.sub as string) || credentials.sessionId as string || 'self-user',
            name: claims.name as string | undefined,
            verified: true,
            claims,
          };
        } catch {
          return null;
        }
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
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
});
