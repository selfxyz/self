# Migration Checklist

- [ ] Scanning: define RN adapters for MRZ/NFC; keep NFC lifecycle in app (screen on).
- [ ] Processing: migrate pure helpers (MRZ parse, NFC response parsing) — first: `extractMRZInfo`, `formatDateToYYMMDD`.
- [ ] Validation: port minimal checks from `validateDocument.ts` (stateless subset).
- [ ] Protocol sync: add paginated tree fetch + TTL cache + root verification.
- [ ] Proof inputs: port `provingInputs.ts` (register/disclose first).
- [ ] TEE session: WS wrapper with `AbortSignal`, timeouts, progress.
- [ ] Attestation: essential verification from `attest.ts`.
- [ ] Crypto: WebCrypto-first via adapter; `@noble/*` fallback; no Node crypto.
- [ ] Artifacts: manifest schema + integrity checks; CDN download + cache (storage adapter).
- [ ] Samples: RN + web minimal flows; iOS scheme `OpenPassport`.
