'use client';

import { useState } from 'react';

const TABS = [
  {
    label: 'NextAuth',
    code: `// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { SelfProvider } from '@selfxyz/auth/next';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    SelfProvider({
      clientId: process.env.SELF_APP_ID!,
      clientSecret: process.env.SELF_CLIENT_SECRET!,
    }),
  ],
});`,
  },
  {
    label: 'Passport.js',
    code: `// server.js
import passport from 'passport';
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

app.get('/auth/self', passport.authenticate('self'));
app.get('/auth/self/callback', passport.authenticate('self', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
}));`,
  },
  {
    label: 'Standalone',
    code: `// For custom backends
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
// result contains { verified, claims, error }`,
  },
];

export function ServerAuthSection() {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(TABS[active].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold mb-2">Server-Side Authentication</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        For applications that need server-side verification, <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">@selfxyz/auth</code> provides
        ready-made providers for popular frameworks.
      </p>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex gap-1">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActive(i)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  i === active
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={copy} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="p-6 text-sm leading-relaxed overflow-x-auto bg-gray-900 text-gray-100">
          <code>{TABS[active].code}</code>
        </pre>
      </div>
    </section>
  );
}
