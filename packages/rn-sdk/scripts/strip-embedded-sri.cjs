// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// SRI integrity attributes require a CORS-validated response. The embedded
// WebView bundle loads over file:// (no CORS headers), so WKWebView fails the
// integrity check and refuses to execute the module — the bundle silently never
// boots on iOS. Strip integrity/crossorigin from the embedded copy only; the
// hosted dist (served over https) keeps SRI intact.
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(__dirname, '..', 'assets', 'self-wallet', 'index.html');

let html;
try {
  html = fs.readFileSync(htmlPath, 'utf-8');
} catch {
  console.error(`strip-embedded-sri: ${htmlPath} not found; run copy-assets first`);
  process.exit(1);
}

// Match both quoting styles: a silent no-op here means WKWebView fails the SRI
// check on file:// and the embedded bundle never boots.
const stripped = html
  .replace(/\s+integrity=("[^"]*"|'[^']*')/g, '')
  .replace(/\s+crossorigin(=("[^"]*"|'[^']*'))?/g, '');

if (stripped !== html) {
  fs.writeFileSync(htmlPath, stripped);
  console.log('strip-embedded-sri: removed integrity/crossorigin from embedded index.html');
} else {
  console.log('strip-embedded-sri: no integrity/crossorigin attributes present');
}
