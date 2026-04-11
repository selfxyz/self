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
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));
```

## Standalone

```typescript
import { SelfOAuth } from '@selfxyz/auth';

const oauth = new SelfOAuth({
  clientId: process.env.SELF_APP_ID,
  clientSecret: process.env.SELF_CLIENT_SECRET,
  redirectUri: 'https://myapp.com/callback',
});

const { url, state, codeVerifier } = oauth.getAuthorizationUrl();
// redirect user to url...

const { token, claims } = await oauth.handleCallback(code, { state, codeVerifier });
```
