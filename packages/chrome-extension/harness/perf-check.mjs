// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Popup cold-load benchmark: imports an account (real relayer), then measures
// repeated opens of index.html?ctx=popup - navigation to first contentful
// paint, and navigation to app-rendered (home text visible). Every popup open
// is a full cold load (anchored popups keep no state), so this is exactly
// what a user feels when clicking the toolbar icon.
import { createECDH, createCipheriv, randomBytes } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  deriveTransferKey,
  transferAad,
} from '@selfxyz/mobile-sdk-alpha/utils/sas';
import puppeteer from 'puppeteer';
import { io } from 'socket.io-client';

import { completeCustodyWithPassword } from './ext-ui.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const EXTENSION_ID = 'ogmglcibieieclolmenndchnccbbmmcf';
const PASSWORD = 'perf-check-password-12plus';
const RUNS = 5;

const DOC_ID = 'd'.repeat(64);
const ACCOUNT = {
  version: 1,
  linkedAt: '2026-07-29T00:00:00.000Z',
  mnemonic: {
    phrase: 'test test test test test test test test test test test junk',
    password: '',
    entropy: '',
    wordlist: { locale: 'en' },
  },
  documentCatalog: {
    documents: [
      {
        id: DOC_ID,
        documentType: 'mock_passport',
        documentCategory: 'passport',
        data: 'P',
        mock: true,
        isRegistered: true,
      },
    ],
    selectedDocumentId: DOC_ID,
  },
  documents: {
    [DOC_ID]: {
      documentType: 'mock_passport',
      documentCategory: 'passport',
      mock: true,
    },
  },
};

function encryptEnvelope(sharedKey, buf, aad) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sharedKey, nonce);
  if (aad) cipher.setAAD(Buffer.from(aad));
  const cipherText = Buffer.concat([cipher.update(buf), cipher.final()]);
  return {
    nonce: nonce.toString('base64'),
    cipherText: cipherText.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

function importAccount(qr) {
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('import ack timeout'));
    }, 60_000);

    const socket = io(`${qr.relay}/websocket`, {
      path: '/',
      transports: ['websocket'],
      forceNew: true,
      query: { sessionId: qr.transferSessionId, clientType: 'web' },
    });

    socket.on('connect', () => {
      const ecdh = createECDH('prime256v1');
      ecdh.generateKeys();
      const shared = ecdh.computeSecret(
        Buffer.from(qr.receiverPublicKey, 'hex'),
      );
      const senderPublicKey = ecdh.getPublicKey('hex', 'uncompressed');
      const binding = {
        sessionId: qr.transferSessionId,
        receiverPublicKey: qr.receiverPublicKey,
        senderPublicKey,
        linkSecret: qr.linkSecret,
      };
      const helloSocket = io(`${qr.relay}/websocket`, {
        path: '/',
        transports: ['websocket'],
        forceNew: true,
        query: { sessionId: qr.helloSessionId, clientType: 'web' },
      });
      helloSocket.on('connect', () => {
        helloSocket.emit('self_app', {
          sessionId: qr.helloSessionId,
          transferType: 'self-account-transfer-hello',
          senderPublicKey,
        });
        setTimeout(() => {
          helloSocket.close();
          socket.emit('self_app', {
            sessionId: qr.transferSessionId,
            transferType: 'self-account-transfer',
            senderPublicKey,
            envelope: encryptEnvelope(
              Buffer.from(deriveTransferKey(new Uint8Array(shared), binding)),
              Buffer.from(JSON.stringify(ACCOUNT)),
              transferAad(binding),
            ),
          });
        }, 1_500);
      });
    });

    socket.on('mobile_status', data => {
      if (data?.status === 'proof_verified') {
        clearTimeout(timer);
        socket.close();
        resolvePromise();
      }
      if (data?.status === 'proof_generation_failed') {
        clearTimeout(timer);
        socket.close();
        reject(new Error('import failed'));
      }
    });
  });
}

const CHROME =
  process.env.CHROME_PATH ??
  join(
    root,
    'chrome/mac_arm-152.0.7962.2/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  );
if (!existsSync(CHROME) || !existsSync(join(dist, 'manifest.json'))) {
  console.error('Missing Chrome for Testing or dist/.');
  process.exit(1);
}

const bundle = statSync(
  join(
    dist,
    'assets',
    (await import('node:fs'))
      .readdirSync(join(dist, 'assets'))
      .find(f => f.startsWith('index-') && f.endsWith('.js')),
  ),
);
console.log(`[perf] main bundle: ${(bundle.size / 1024 / 1024).toFixed(1)}MB`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: join(tmpdir(), `self-ext-perf-${Date.now()}`),
  args: [
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    '--no-first-run',
    ...(process.env.CI
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      : []),
  ],
});

try {
  const page = await browser.newPage();
  await page.goto(
    `chrome-extension://${EXTENSION_ID}/index.html?ext_route=link`,
    { waitUntil: 'load' },
  );
  await page.waitForSelector('[data-qr-content]', { timeout: 30_000 });
  const qr = JSON.parse(
    await page.$eval('[data-qr-content]', node => node.dataset.qrContent),
  );
  const importDone = importAccount(qr);
  await completeCustodyWithPassword(page, PASSWORD);
  await importDone;
  console.log('[perf] account imported, measuring popup opens');

  const fcpTimes = [];
  const renderTimes = [];
  const gateTimes = [];
  for (let run = 0; run < RUNS; run++) {
    const p = await browser.newPage();
    await p.goto(`chrome-extension://${EXTENSION_ID}/index.html?ctx=popup`, {
      waitUntil: 'load',
    });
    await p.waitForFunction(
      () => document.body.innerText.includes('POINTS BALANCE'),
      { timeout: 30_000 },
    );
    const t = await p.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paint = performance
        .getEntriesByType('paint')
        .find(entry => entry.name === 'first-contentful-paint');
      const marks = Object.fromEntries(
        performance.getEntriesByType('mark').map(m => [m.name, m.startTime]),
      );
      return {
        fcp: paint ? paint.startTime : null,
        rendered: performance.now(),
        domInteractive: nav.domInteractive,
        gate: marks['self-ext-gate-done'] ?? null,
      };
    });
    fcpTimes.push(t.fcp);
    renderTimes.push(t.rendered);
    if (t.gate !== null) gateTimes.push(t.gate);
    console.log(
      `[perf] run ${run + 1}: fcp=${t.fcp?.toFixed(0)}ms domInteractive=${t.domInteractive.toFixed(0)}ms rendered=${t.rendered.toFixed(0)}ms${t.gate !== null ? ` gate=${t.gate.toFixed(0)}ms` : ''}`,
    );
    await p.close();
  }

  const median = values =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  console.log(
    `[perf] median: fcp=${median(fcpTimes)?.toFixed(0)}ms rendered=${median(renderTimes).toFixed(0)}ms over ${RUNS} runs`,
  );
  console.log('PERF CHECK DONE');
} finally {
  await browser.close();
}
