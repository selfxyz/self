/**
 * E2E Test Server for Self Verify Widget
 *
 * Serves the widget on a public URL (via ngrok) and handles the verification
 * webhook from the relayer. This lets you test the full flow:
 *
 *   1. Open the public URL in a browser
 *   2. Expand the widget -> QR code appears
 *   3. Scan with Self app (sandbox mode)
 *   4. Self app generates proof -> relayer POSTs to /api/verify
 *   5. We run SelfBackendVerifier -> respond to relayer
 *   6. Widget gets self:success via WebSocket
 *
 * Usage:
 *   node test/e2e-server.mjs
 *
 * Requires:
 *   - ngrok installed and authenticated
 *   - @selfxyz/core built (yarn workspace @selfxyz/core build)
 *   - Widget built (yarn build in sdk/widget/)
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawn } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 3456;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
};

let SelfBackendVerifier, DefaultConfigStore;

async function loadCore() {
  try {
    const core = await import('../../core/dist/index.js');
    SelfBackendVerifier = core.SelfBackendVerifier;
    DefaultConfigStore = core.DefaultConfigStore;
    console.log('[core] @selfxyz/core loaded successfully');
    return true;
  } catch (e) {
    console.error('[core] Failed to load @selfxyz/core:', e.message);
    console.error('[core] Run: yarn workspace @selfxyz/core build');
    return false;
  }
}

async function startNgrok(port) {
  // Kill any existing ngrok processes
  try { execFileSync('pkill', ['-f', 'ngrok'], { stdio: 'ignore' }); } catch { /* ignore */ }

  const ngrok = spawn('ngrok', ['http', String(port), '--log=stdout'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('ngrok startup timeout')), 15000);

    const pollInterval = setInterval(async () => {
      try {
        const resp = await fetch('http://127.0.0.1:4040/api/tunnels');
        const data = await resp.json();
        if (data.tunnels && data.tunnels.length > 0) {
          const tunnel = data.tunnels.find(t => t.proto === 'https') || data.tunnels[0];
          clearTimeout(timeout);
          clearInterval(pollInterval);
          resolve({ url: tunnel.public_url, process: ngrok });
        }
      } catch {
        // ngrok API not ready yet
      }
    }, 500);

    ngrok.on('error', (err) => {
      clearTimeout(timeout);
      clearInterval(pollInterval);
      reject(err);
    });
  });
}

function generateTestPage(ngrokUrl) {
  const scope = 'widget-e2e-test';
  const endpoint = `${ngrokUrl}/api/verify`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Self Widget E2E Test</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; background: #f9f9f9; }
    h1 { font-size: 22px; }
    .info { background: #e8f4fd; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; line-height: 1.6; }
    .info code { background: #d0e8f5; padding: 2px 6px; border-radius: 4px; }
    .widget-container { background: white; padding: 24px; border-radius: 12px; margin: 24px 0; }
    .log { font-family: monospace; font-size: 12px; background: #1a1a1a; color: #00ff88; padding: 16px; border-radius: 8px; max-height: 300px; overflow-y: auto; margin: 16px 0; }
    .log .error { color: #ff4444; }
    .log .success { color: #00ff88; font-weight: bold; }
    .log .status { color: #01BFFF; }
  </style>
</head>
<body>
  <h1>Self Widget E2E Test</h1>
  <div class="info">
    <strong>Endpoint:</strong> <code id="endpoint-display"></code><br>
    <strong>Scope:</strong> <code>${scope}</code><br>
    <strong>Preset:</strong> age-18 (minimum age 18)<br><br>
    <strong>Instructions:</strong><br>
    1. Click "Verify with Self" to expand the widget<br>
    2. Scan the QR code with the Self app<br>
    3. Complete verification in the app<br>
    4. Watch the event log for the result
  </div>
  <div class="widget-container">
    <self-verify
      app-name="Widget E2E Test"
      app-scope="${scope}"
      app-endpoint="${endpoint}"
      preset="age-18"
    ></self-verify>
  </div>
  <h3>Event Log</h3>
  <div class="log" id="log"></div>
  <script src="/dist/cdn/self-verify.js"></script>
  <script>
    document.getElementById('endpoint-display').textContent = '${endpoint}';
    var log = document.getElementById('log');
    function addLog(msg, cls) {
      var line = document.createElement('div');
      if (cls) line.className = cls;
      line.textContent = new Date().toISOString().slice(11, 23) + ' ' + msg;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    }
    addLog('Widget loaded, waiting for interaction...', 'status');
    var widget = document.querySelector('self-verify');
    widget.addEventListener('self:status', function(e) {
      addLog('STATUS: ' + e.detail.label + ' (step=' + e.detail.step + ')', 'status');
    });
    widget.addEventListener('self:success', function(e) {
      addLog('SUCCESS! verified=' + e.detail.verified + ' sessionId=' + e.detail.sessionId, 'success');
    });
    widget.addEventListener('self:error', function(e) {
      addLog('ERROR: ' + (e.detail.reason || e.detail.errorCode || 'unknown'), 'error');
    });
  </script>
</body>
</html>`;
}

async function main() {
  console.log('=== Self Widget E2E Test Server ===\n');

  const coreLoaded = await loadCore();

  console.log('[ngrok] Starting tunnel...');
  let ngrokInfo;
  try {
    ngrokInfo = await startNgrok(PORT);
    console.log('[ngrok] Public URL:', ngrokInfo.url, '\n');
  } catch (e) {
    console.error('[ngrok] Failed to start:', e.message);
    process.exit(1);
  }

  const NGROK_URL = ngrokInfo.url;
  const SCOPE = 'widget-e2e-test';
  const ENDPOINT = `${NGROK_URL}/api/verify`;

  let verifier = null;
  if (coreLoaded) {
    try {
      const configStore = new DefaultConfigStore({ minimumAge: 18 });
      const allowedIds = new Map([[1, true], [2, true]]);
      verifier = new SelfBackendVerifier(
        SCOPE,
        ENDPOINT,
        false, // mockPassport = false → production/mainnet
        allowedIds,
        configStore,
        'uuid'
      );
      console.log('[verifier] SelfBackendVerifier initialized (staging)');
      console.log('[verifier] Scope:', SCOPE);
      console.log('[verifier] Endpoint:', ENDPOINT);
    } catch (e) {
      console.error('[verifier] Init error:', e.message);
    }
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Webhook endpoint
    if (url.pathname === '/api/verify' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        console.log('\n[webhook] ========================================');
        console.log('[webhook] Received proof from relayer!');
        console.log('[webhook] Body length:', body.length, 'bytes');

        try {
          const data = JSON.parse(body);
          console.log('[webhook] attestationId:', data.attestationId);
          console.log('[webhook] publicSignals count:', (data.publicSignals || []).length);
          console.log('[webhook] proof keys:', Object.keys(data.proof || {}));

          if (verifier) {
            console.log('[webhook] Running SelfBackendVerifier.verify()...');
            try {
              const result = await verifier.verify(
                data.attestationId || 1,
                data.proof,
                data.publicSignals,
                data.userContextData || ''
              );
              console.log('[webhook] VERIFIED:', JSON.stringify(result.isValidDetails));
              console.log('[webhook] Disclosed:', JSON.stringify({
                nationality: result.discloseOutput?.nationality,
                minimumAge: result.discloseOutput?.minimumAge,
              }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'success', result: result.isValidDetails.isValid }));
            } catch (verifyError) {
              console.error('[webhook] Verification error:', verifyError.message);
              if (verifyError.issues) {
                verifyError.issues.forEach(i => console.error('[webhook]  -', i.type, ':', i.message));
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'error', result: false, reason: verifyError.message }));
            }
          } else {
            console.log('[webhook] No verifier — accepting without verification');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', result: true }));
          }
        } catch (e) {
          console.error('[webhook] Parse error:', e.message);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', result: false, reason: 'Invalid JSON' }));
        }
        console.log('[webhook] ========================================\n');
      });
      return;
    }

    // Test page
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(generateTestPage(NGROK_URL));
      return;
    }

    // Static files
    const filePath = join(ROOT, url.pathname);
    try {
      const content = readFileSync(filePath);
      const ext = extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(PORT, () => {
    console.log(`\n[server] Local: http://localhost:${PORT}`);
    console.log(`[server] Public: ${NGROK_URL}`);
    console.log(`[server] Webhook: ${ENDPOINT}`);
    console.log('\n============================================');
    console.log(`  Open in your browser:`);
    console.log(`  ${NGROK_URL}`);
    console.log('============================================');
    console.log('\nPress Ctrl+C to stop.\n');
  });

  process.on('SIGINT', () => {
    console.log('\n[cleanup] Shutting down...');
    server.close();
    if (ngrokInfo?.process) ngrokInfo.process.kill();
    process.exit(0);
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
