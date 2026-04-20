# Self Verify Demo

Next.js app demonstrating "Sign in with Self" — passport-based identity verification using zero-knowledge proofs. Users scan a QR code with the Self app, generate a ZK-SNARK proof on their phone, and the server verifies it against Celo Sepolia on-chain contracts.

## Quick Start

```bash
# From repo root
yarn install

# Generate a NextAuth secret
openssl rand -base64 32

# Copy and fill in .env.local
cp sdk/self-verify-demo/.env.example sdk/self-verify-demo/.env.local
# Edit .env.local — set NEXTAUTH_SECRET to the generated value

# Start ngrok (required for Self app to reach your proof callback)
ngrok http 3000
# Copy the https URL into .env.local for NEXT_PUBLIC_APP_URL and NEXTAUTH_URL

# Start the dev server
cd sdk/self-verify-demo
yarn dev
```

Open http://localhost:3000 in a browser. Use localhost (not the ngrok URL) for the browser — ngrok is only needed so the Self mobile app can POST proofs to your server.

## Architecture

```
Browser                    Self App                    Server
  │                          │                           │
  ├─ POST /api/verify/session ──────────────────────────►│ creates pending session (UUID)
  │◄─── { sessionId } ─────────────────────────────────┤
  │                          │                           │
  ├─ mount <self-verify>     │                           │
  │  user-id=sessionId       │                           │
  │  app-endpoint=<ngrok>/api/verify/proof               │
  │  preset=kyc-basic        │                           │
  │                          │                           │
  ├──── QR code ────────────►│                           │
  │                          │ user scans, approves      │
  │                          ├─ POST /api/verify/proof ─►│
  │                          │  {attestationId, proof,   │
  │                          │   publicSignals,          │
  │                          │   userContextData}        │
  │                          │                           ├─ parse sessionId from userContextData
  │                          │                           ├─ look up session → get preset
  │                          │                           ├─ SelfVerifier.verify()
  │                          │                           │   • scope hash check
  │                          │                           │   • Merkle root (Celo Sepolia RPC)
  │                          │                           │   • on-chain verifyProof() (Groth16)
  │                          │                           │   • preset gates (age, OFAC)
  │                          │                           ├─ mark session verified + claims
  │                          │◄──── { status: verified } ┤
  │                          │                           │
  │◄── self:success event ───┤                           │
  │                          │                           │
  ├─ signIn('self-verify', {sessionId}) ────────────────►│ NextAuth authorize()
  │                          │                           ├─ reads server session store
  │◄──── session cookie ────────────────────────────────┤ mints cookie if verified
```

## Key Files

| File | Purpose |
|------|---------|
| `app/api/verify/proof/route.ts` | Receives ZK proof from Self app, runs `SelfVerifier.verify()` against Celo Sepolia |
| `app/api/verify/session/route.ts` | Creates pending sessions with preset binding |
| `app/api/verify/status/[sessionId]/route.ts` | Polls session status (used by frontend) |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth handler — delegates to `lib/auth.ts` |
| `lib/auth.ts` | NextAuth config with Credentials provider backed by server session store |
| `lib/sessions.ts` | In-memory session Map (10-min TTL, single-process only) |
| `lib/presets.ts` | Three demo presets: human, age-18, kyc-basic |
| `components/LoginDemo.tsx` | "Sign in with Self" flow — mounts widget, calls signIn on success |
| `components/VerificationCard.tsx` | Standalone verification cards for the landing page |

## Presets

| Preset | Verifies | Discloses |
|--------|----------|-----------|
| `human` | Valid passport proof | Nothing (pure humanity check) |
| `age-18` | Minimum age 18 | `minimumAge` |
| `kyc-basic` | OFAC compliance | Name, nationality, date of birth |

## Security Model

- **Browser cannot forge verification.** `authorize()` only mints a session cookie if the server-side session store shows `status === 'verified'`. Only the `/api/verify/proof` endpoint (called server-to-server by the Self app, not by the browser) can flip that status.
- **Real ZK verification.** `SelfVerifier` checks scope hash, user-context hash, Merkle root on Celo Sepolia, attestation ID, timestamp window, then calls the on-chain Groth16 verifier.
- **Session binding.** The widget's `user-id` attribute embeds the sessionId into the circuit's `userContextData`. The proof endpoint recovers it and binds it back to the server session.
- **Fail-closed auth.** `authorize()` refuses to create sessions if `NEXTAUTH_SECRET` is missing at runtime.

## Known Limitations

- **In-memory session store** — sessions live in a `Map` and are lost on process restart. Not suitable for multi-worker or serverless deployments. Swap for Redis/Upstash for production.
- **testnet only** — verifier is configured with `testnet: true` (Celo Sepolia). Switch to `testnet: false` for mainnet.
- **Single-process** — no session sharing across workers. Use a persistent store + sticky sessions or external session backend for horizontal scaling.
- **ngrok dependency** — local dev requires an ngrok tunnel so the Self app can reach the proof callback. The ngrok URL changes on restart; update `.env.local` accordingly.

## Environment Variables

See `.env.example` for the full list. Critical ones:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` — fail-closed if missing |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL (ngrok for dev, domain for prod). Used in scope hash and as the proof callback URL. |
| `NEXT_PUBLIC_SELF_APP_SCOPE` | Yes | Must match between widget mount and `SelfVerifier` config. Default: `self-verify-demo` |
| `NEXTAUTH_URL` | Yes | Should match `NEXT_PUBLIC_APP_URL` for NextAuth redirect handling |
