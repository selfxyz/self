/**
 * E2E Token Mode Test Server
 *
 * Serves the widget with mode="token" on a public URL (via ngrok).
 * The verification flow goes through verify-service instead of a local webhook.
 *
 * Prerequisites (all running):
 *   - Postgres on localhost:5432
 *   - Redis on localhost:6379
 *   - db-relayer on localhost:3007
 *   - relayer on localhost:3006
 *   - verify-service on localhost:3010
 *   - ngrok installed
 *
 * Usage:
 *   node test/e2e-token-server.mjs
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

async function startNgrok(port) {
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

async function registerApp(scope, endpoint) {
  console.log('[register] Registering app with verify-service...');
  const resp = await fetch('http://localhost:3010/register-app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appName: 'Token Mode E2E Test',
      scope,
      endpoint,
      disclosures: { minimumAge: 18 },
      userIdType: 'uuid',
    }),
  });
  const data = await resp.json();
  console.log('[register] App registered:', data.appId);
  return data.appId;
}

function generateTestPage(ngrokUrl, scope) {
  let html = readFileSync(join(__dirname, 'token-mode-test.html'), 'utf-8');
  // Replace the placeholder endpoint with the ngrok URL
  html = html.replace('app-endpoint="PLACEHOLDER"', `app-endpoint="${ngrokUrl}/api/verify"`);
  html = html.replace('app-scope="widget-token-e2e"', `app-scope="${scope}"`);
  // Set the endpoint display
  html = html.replace("document.getElementById('endpoint-display')", `
    document.getElementById('endpoint-display').textContent = '${ngrokUrl}/api/verify';
    void(0)`);
  return html;
}

async function main() {
  console.log('=== Self Widget Token Mode E2E Test ===\n');

  // Check verify-service is running
  try {
    const health = await fetch('http://localhost:3010/health');
    const data = await health.json();
    console.log('[verify-service] Running, registered apps:', data.registeredApps);
  } catch {
    console.error('[verify-service] NOT RUNNING! Start with: cd self-infra/verify-service && node src/index.js');
    process.exit(1);
  }

  // Check db-relayer
  try {
    const health = await fetch('http://localhost:3007/health-check');
    console.log('[db-relayer] Running');
  } catch {
    console.error('[db-relayer] NOT RUNNING on port 3007');
    process.exit(1);
  }

  // Check relayer
  try {
    const health = await fetch('http://localhost:3006/health');
    console.log('[relayer] Running');
  } catch {
    console.error('[relayer] NOT RUNNING on port 3006');
    process.exit(1);
  }

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
  const SCOPE = 'widget-token-e2e';
  const ENDPOINT = `${NGROK_URL}/api/verify`;

  // Register the app with verify-service
  const appId = await registerApp(SCOPE, ENDPOINT);

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

    // The /api/verify endpoint is NOT needed in token mode
    // (verify-service handles it). But we add a stub for clarity.
    if (url.pathname === '/api/verify' && req.method === 'POST') {
      console.log('[webhook] /api/verify called — this should NOT happen in token mode!');
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        console.log('[webhook] Body:', body.slice(0, 200));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', result: true }));
      });
      return;
    }

    // Test page
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(generateTestPage(NGROK_URL, SCOPE));
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
    console.log(`[server] Mode: TOKEN (JWT via verify-service)`);
    console.log(`[server] App registered: ${appId}`);
    console.log('\n============================================');
    console.log(`  Open in your browser:`);
    console.log(`  ${NGROK_URL}`);
    console.log('============================================');
    console.log('\nNote: If /api/verify is called, token mode is NOT working.');
    console.log('The proof should go: relayer → verify-service → JWT → widget');
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
