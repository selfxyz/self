## WebView App Hosting Setup

> Last updated: 2026-03-30
> Status: Ready

- Workstream: sdk-distribution
- Backlog IDs: SD-03
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

- The native shells are switching from embedded bundles to loading `https://verify.self.xyz/v1/`.
- The WebView app must be deployed and reachable at that URL before SD-01 and SD-02 can be tested or shipped.
- This is the critical-path prerequisite for the entire SDK distribution workstream.

### Scope

- Deploy `packages/webview-app/` build output at `https://verify.self.xyz/v1/`
- Handle `/v1/` base path (either via `base` in Vite config or hosting-layer URL rewrite)
- SPA rewrite rules (all paths under `/v1/` serve `index.html`)
- Security headers: HSTS (`Strict-Transport-Security`), appropriate `Content-Security-Policy`
- Cache headers: hashed assets get long-lived `Cache-Control`, `index.html` gets short TTL or `no-cache`

### Out of Scope

- WebView app source code changes (owned by WebView workstream)
- CI/CD pipeline for automated deployments (separate follow-up)
- CDN bundle integrity / signed manifests (BP-02, deferred)
- Multiple environment deployments (staging, preview) — follow-up

### Files to Modify

- `packages/webview-app/vite.config.ts` — Add `base: '/v1/'` so asset paths resolve correctly under the versioned path. This is the only source code change.

### Files NOT to Modify

- `packages/webview-app/src/` — No application code changes
- `packages/webview-bridge/` — Upstream, do not change
- `packages/native-shell-android/` — Downstream, SD-01
- `packages/native-shell-ios/` — Downstream, SD-02

### Preconditions

- `packages/webview-app/` builds successfully (`yarn workspace @selfxyz/webview-app build`)
- DNS for `verify.self.xyz` is configured (or can be configured)

### Implementation Details

1. **Vite base path**:
   - Set `base: '/v1/'` in `vite.config.ts`
   - This makes all asset references (`/v1/assets/index-abc123.js`) resolve correctly
   - Alternatively, the hosting layer can rewrite `/v1/*` → `/*` and leave `base` as `/` — decide based on hosting provider capabilities

2. **Hosting requirements** (provider-agnostic):
   - **SPA rewrite**: Any request to `/v1/*` that doesn't match a static file must serve `/v1/index.html`
   - **HTTPS**: TLS required. No HTTP access in production.
   - **HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - **Cache policy**:
     - `/v1/index.html`: `Cache-Control: no-cache` (always revalidate — enables auto-update)
     - `/v1/assets/*` (hashed filenames): `Cache-Control: public, max-age=31536000, immutable`
   - **Content-Security-Policy**: Restrict `script-src` to `'self'`, allow `connect-src` for API endpoints the WebView needs

3. **Deployment process** (manual for SD-03, automated later):
   - `yarn workspace @selfxyz/webview-app build`
   - Deploy `packages/webview-app/dist/` under `/v1/` path
   - Verify with curl

### Validation

```bash
# Build the WebView app
yarn workspace @selfxyz/webview-app build

# After deployment, verify the hosted URL
curl -sI https://verify.self.xyz/v1/ | head -20
# Expected: HTTP/2 200, Strict-Transport-Security header present

# Verify SPA rewrite works
curl -sI https://verify.self.xyz/v1/some/deep/route | head -5
# Expected: HTTP/2 200 (serves index.html)

# Verify hashed assets have correct cache headers
curl -sI https://verify.self.xyz/v1/assets/index-abc123.js | grep -i cache-control
# Expected: public, max-age=31536000, immutable
```

### Definition of Done

- [ ] `https://verify.self.xyz/v1/` returns 200 with the WebView app
- [ ] HSTS header present in response
- [ ] SPA rewrite works (deep paths serve `index.html`)
- [ ] Hashed assets have immutable cache headers
- [ ] `index.html` has `no-cache` (enables auto-update)
- [ ] Vite `base` configured for `/v1/` path
- [ ] WebView app loads and bridge initializes when opened in a browser
- [ ] Backlog row updated
- [ ] Plan status updated

### Status Log

- 2026-03-30: Plan created.
