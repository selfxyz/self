# @selfxyz/auth

OAuth providers for Self identity verification. Drop-in support for NextAuth v5, Passport.js, or standalone usage.

## NextAuth v5

```bash
npm install @selfxyz/auth next-auth
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { SelfProvider } from '@selfxyz/auth/next';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    SelfProvider({
      clientId: process.env.SELF_APP_ID!,
      clientSecret: process.env.SELF_CLIENT_SECRET!,
    }),
  ],
});
```

## Passport.js

```bash
npm install @selfxyz/auth passport passport-oauth2
```

```typescript
import { SelfStrategy } from '@selfxyz/auth/passport';

passport.use(new SelfStrategy({
  clientID: process.env.SELF_APP_ID,
  clientSecret: process.env.SELF_CLIENT_SECRET,
  callbackURL: '/auth/self/callback',
}, (tokenResult, done) => {
  // tokenResult contains { verified, claims, error }
  if (tokenResult.verified) {
    return done(null, tokenResult.claims);
  }
  return done(new Error(tokenResult.error || 'Verification failed'));
}));
```

## Standalone

```typescript
import { SelfOAuth } from '@selfxyz/auth';

const oauth = new SelfOAuth({
  appId: process.env.SELF_APP_ID,
  clientSecret: process.env.SELF_CLIENT_SECRET,
  redirectUri: 'https://myapp.com/callback',
});

// Step 1: Generate authorization URL
const { url, state, codeVerifier } = oauth.getAuthorizationUrl();
// Save state + codeVerifier to session, redirect user to url

// Step 2: Handle OAuth callback
const result = await oauth.handleCallback(
  { code: query.code, state: query.state },
  { state: savedState, codeVerifier: savedCodeVerifier },
);
// result contains { verified, claims, error }
```
