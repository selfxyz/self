import {
  createECDH,
  createCipheriv,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { existsSync } from 'node:fs';
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
const headed = process.argv.includes('--headed');
const EXTENSION_ID = 'ogmglcibieieclolmenndchnccbbmmcf';
const PASSWORD = 'disclose-check-password';
const RELAY = 'wss://websocket.staging.self.xyz';

const DOC_ID = 'b'.repeat(64);
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
        data: 'PXXBOX',
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

function encryptEnvelope(sharedKey, plaintextBuf, aad) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sharedKey, nonce);
  if (aad) cipher.setAAD(Buffer.from(aad));
  const cipherText = Buffer.concat([
    cipher.update(plaintextBuf),
    cipher.final(),
  ]);
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
              Buffer.from(JSON.stringify(ACCOUNT), 'utf8'),
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

function watchRpSession(sessionId) {
  const statuses = [];
  const socket = io(`${RELAY}/websocket`, {
    path: '/',
    transports: ['websocket'],
    forceNew: true,
    query: { sessionId, clientType: 'web' },
  });
  socket.on('mobile_status', data => {
    if (data?.status) {
      statuses.push(data.status);
      console.log(`[rp] mobile_status: ${data.status}`);
    }
    if (data?.status === 'mobile_connected') {
      socket.emit('self_app', { sessionId, scope: 'ext-spike-demo' }); // mirrors sdk/qrcode behavior
    }
  });
  return { statuses, close: () => socket.close() };
}

const CHROME = join(
  root,
  'chrome/mac_arm-152.0.7962.2/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
if (!existsSync(CHROME) || !existsSync(join(dist, 'manifest.json'))) {
  console.error('Missing Chrome for Testing or dist/.');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !headed,
  userDataDir: join(tmpdir(), `self-ext-disclose-${Date.now()}`),
  args: [
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    '--no-first-run',
  ],
});

let rp;
try {
  const page = await browser.newPage();
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[self-ext]') || msg.type() === 'error')
      console.log(`[page:${msg.type()}] ${text.slice(0, 160)}`);
  });

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
  console.log('[harness] account imported');

  const sessionId = randomUUID();
  rp = watchRpSession(sessionId);
  const query = new URLSearchParams({
    ext_mode: 'embed',
    verificationId: sessionId,
    userId: randomUUID(),
    scope: 'ext-spike-demo',
    disclosures: 'minimumAge:18,nationality',
    appName: 'Disclose Check',
    appEndpoint: 'https://playground.staging.self.xyz/api/verify',
    endpointType: 'staging_https',
    userIdType: 'uuid',
    environment: 'stg',
    timestamp: String(Date.now()),
  });
  await page.goto(`chrome-extension://${EXTENSION_ID}/index.html?${query}`, {
    waitUntil: 'load',
  });

  await page.waitForFunction(
    () => window.location.pathname === '/disclose/request',
    { timeout: 20_000 },
  );
  await page.waitForFunction(() => document.body.innerText.length > 50, {
    timeout: 20_000,
  });
  const consentText = await page.evaluate(() =>
    document.body.innerText.replace(/\n/g, ' | ').slice(0, 300),
  );
  console.log(`[harness] consent screen: ${consentText}`);
  await page.screenshot({ path: join(root, 'disclose-consent.png') });

  await new Promise(r => setTimeout(r, 1_500));
  if (!rp.statuses.includes('mobile_connected'))
    throw new Error('RP session never saw mobile_connected');

  const deadline = Date.now() + 120_000;
  let resultReached = false;
  while (Date.now() < deadline && !resultReached) {
    const path = await page.evaluate(() => window.location.pathname);
    if (path === '/disclose/result' || path === '/recover/required') {
      resultReached = true;
      break;
    }
    for (const button of await page.$$('button')) {
      const label = (
        await button.evaluate(node => node.innerText)
      ).toLowerCase();
      if (
        label.includes('verify') ||
        label.includes('confirm') ||
        label.includes('approve')
      ) {
        await button.click();
        console.log(`[harness] clicked consent button: "${label.trim()}"`);
      }
    }
    await new Promise(r => setTimeout(r, 1_000));
  }
  if (!resultReached) throw new Error('never reached a terminal route');
  const resultPath = await page.evaluate(() => window.location.pathname);
  console.log(`[harness] terminal route: ${resultPath}`);
  await page.screenshot({ path: join(root, 'disclose-result.png') });

  if (resultPath === '/disclose/result') {
    const closeButtons = await page.$$('button');
    for (const button of closeButtons) {
      const { label, aria } = await button.evaluate(node => ({
        label: node.innerText.trim().toLowerCase(),
        aria: (node.getAttribute('aria-label') ?? '').toLowerCase(),
      }));
      if (
        label === '' ||
        label === 'x' ||
        label.includes('close') ||
        aria.includes('close')
      ) {
        await button.click();
        console.log(
          `[harness] clicked close button (label="${label}", aria="${aria}")`,
        );
        break;
      }
    }
    await new Promise(r => setTimeout(r, 3_000));
    if (!rp.statuses.includes('proof_generation_failed')) {
      throw new Error(
        `RP session missing proof_generation_failed; saw: ${rp.statuses.join(',')}`,
      );
    }
    console.log('[harness] RP session received proof_generation_failed');
  } else {
    console.log(
      '[harness] note: flow ended off the generic result route; inspect screenshots',
    );
  }

  console.log(`[harness] RP statuses: ${rp.statuses.join(', ')}`);
  console.log('DISCLOSE WIRING OK');
} finally {
  rp?.close();
  await browser.close();
}
