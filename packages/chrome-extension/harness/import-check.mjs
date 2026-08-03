import { createECDH, createCipheriv, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  deriveTransferKey,
  sasEmojis,
  transferAad,
} from '@selfxyz/mobile-sdk-alpha/utils/sas';
import puppeteer from 'puppeteer';
import { io } from 'socket.io-client';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const headed = process.argv.includes('--headed');
const EXTENSION_ID = 'ogmglcibieieclolmenndchnccbbmmcf';
const PASSWORD = 'import-check-password-12plus';

const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';
const DOC_ID = 'a'.repeat(64);
const PAYLOAD = {
  version: 1,
  linkedAt: '2026-07-29T00:00:00.000Z',
  mnemonic: {
    phrase: TEST_MNEMONIC,
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
        data: 'PXXBOX<<XXXXX',
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
      mrz: 'P<XXX...',
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

function runSender(qr, sharedOut = {}) {
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('sender timeout: no ack from extension'));
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
      sharedOut.secret = shared;
      sharedOut.binding = binding;
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
        console.log('[sender] hello pushed');
        setTimeout(() => {
          helloSocket.close();
          socket.emit('self_app', {
            sessionId: qr.transferSessionId,
            transferType: 'self-account-transfer',
            senderPublicKey,
            envelope: encryptEnvelope(
              Buffer.from(deriveTransferKey(new Uint8Array(shared), binding)),
              Buffer.from(JSON.stringify(PAYLOAD), 'utf8'),
              transferAad(binding),
            ),
          });
          console.log('[sender] envelope pushed');
        }, 1_500);
      });
    });

    socket.on('mobile_status', data => {
      if (data?.status === 'proof_verified') {
        console.log('[sender] extension acked (proof_verified)');
        clearTimeout(timer);
        socket.close();
        resolvePromise();
      }
      if (data?.status === 'proof_generation_failed') {
        clearTimeout(timer);
        socket.close();
        reject(new Error('extension reported transfer failure'));
      }
    });
    socket.on('connect_error', err =>
      console.log(`[sender] connect_error ${err.message}`),
    );
  });
}

const CHROME =
  process.env.CHROME_PATH ??
  join(
    root,
    'chrome/mac_arm-152.0.7962.2/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  );
if (!existsSync(CHROME) || !existsSync(join(dist, 'manifest.json'))) {
  console.error(
    'Missing Chrome for Testing or dist/. See boot-check.mjs header.',
  );
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !headed,
  userDataDir: join(tmpdir(), `self-ext-import-${Date.now()}`),
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
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  const relayParam = process.env.RELAY_URL
    ? `?relay=${encodeURIComponent(process.env.RELAY_URL)}`
    : '';
  await page.goto(`chrome-extension://${EXTENSION_ID}/link.html${relayParam}`, {
    waitUntil: 'load',
  });
  await page.waitForSelector('#qr[data-qr-content]', { timeout: 15_000 });
  const qr = JSON.parse(
    await page.$eval('#qr', node => node.dataset.qrContent),
  );
  console.log(
    `[harness] QR: session=${qr.transferSessionId} relay=${qr.relay}`,
  );

  const sharedOut = {};
  const senderDone = runSender(qr, sharedOut);
  await page.waitForSelector('#step-password:not(.hidden)', {
    timeout: 60_000,
  });
  console.log('[harness] password step visible');

  const pageSas = (await page.$eval('#sas', node => node.textContent)).trim();
  const scanSas = (
    await page.$eval('#sas-scan', node => node.textContent)
  ).trim();
  const expectedSas = sasEmojis(
    new Uint8Array(sharedOut.secret),
    sharedOut.binding,
  ).join('  ');
  if (pageSas !== expectedSas)
    throw new Error(`SAS mismatch: page="${pageSas}" sender="${expectedSas}"`);
  if (scanSas !== expectedSas)
    throw new Error(
      `pre-send SAS mismatch: scan="${scanSas}" sender="${expectedSas}"`,
    );
  console.log(
    `[harness] SAS matches on both sides (pre-send + import): ${pageSas}`,
  );

  const attacker = createECDH('prime256v1');
  attacker.generateKeys();
  const attackerPub = attacker.getPublicKey('hex', 'uncompressed');
  const attackerShared = attacker.computeSecret(
    Buffer.from(qr.receiverPublicKey, 'hex'),
  );
  const attackerBinding = {
    sessionId: qr.transferSessionId,
    receiverPublicKey: qr.receiverPublicKey,
    senderPublicKey: attackerPub,
    linkSecret: qr.linkSecret,
  };
  const rogue = io(`${qr.relay}/websocket`, {
    path: '/',
    transports: ['websocket'],
    forceNew: true,
    query: { sessionId: qr.transferSessionId, clientType: 'web' },
  });
  await new Promise(resolve => rogue.on('connect', resolve));
  rogue.emit('self_app', {
    sessionId: qr.transferSessionId,
    transferType: 'self-account-transfer',
    senderPublicKey: attackerPub,
    envelope: encryptEnvelope(
      Buffer.from(
        deriveTransferKey(new Uint8Array(attackerShared), attackerBinding),
      ),
      Buffer.from(
        JSON.stringify({ ...PAYLOAD, mnemonic: { phrase: 'attacker owned' } }),
        'utf8',
      ),
      transferAad(attackerBinding),
    ),
  });
  await new Promise(resolve => setTimeout(resolve, 1_500));
  rogue.close();
  const stillOnPassword = await page.$eval(
    '#step-password',
    node => !node.classList.contains('hidden'),
  );
  const pageSasAfter = (
    await page.$eval('#sas', node => node.textContent)
  ).trim();
  if (!stillOnPassword || pageSasAfter !== expectedSas) {
    throw new Error('substituted-sender envelope was not refused');
  }
  console.log(
    '[harness] substituted-sender envelope refused (hello key pinned)',
  );

  const offPath = createECDH('prime256v1');
  offPath.generateKeys();
  const offPathPub = offPath.getPublicKey('hex', 'uncompressed');
  const offPathShared = offPath.computeSecret(
    Buffer.from(qr.receiverPublicKey, 'hex'),
  );
  const guessedBinding = {
    sessionId: qr.transferSessionId,
    receiverPublicKey: qr.receiverPublicKey,
    senderPublicKey: offPathPub,
    linkSecret: randomBytes(32).toString('base64'), // never saw the QR
  };
  const offPathSocket = io(`${qr.relay}/websocket`, {
    path: '/',
    transports: ['websocket'],
    forceNew: true,
    query: { sessionId: qr.transferSessionId, clientType: 'web' },
  });
  await new Promise(resolve => offPathSocket.on('connect', resolve));
  offPathSocket.emit('self_app', {
    sessionId: qr.transferSessionId,
    transferType: 'self-account-transfer',
    senderPublicKey: offPathPub,
    envelope: encryptEnvelope(
      Buffer.from(
        deriveTransferKey(new Uint8Array(offPathShared), guessedBinding),
      ),
      Buffer.from(
        JSON.stringify({ ...PAYLOAD, mnemonic: { phrase: 'off path' } }),
        'utf8',
      ),
      transferAad(guessedBinding),
    ),
  });
  await new Promise(resolve => setTimeout(resolve, 1_500));
  offPathSocket.close();
  const sasUnchanged = (
    await page.$eval('#sas', node => node.textContent)
  ).trim();
  if (sasUnchanged !== expectedSas)
    throw new Error('off-path envelope altered the session');
  console.log(
    '[harness] off-path envelope refused (linkSecret unknown to attacker)',
  );

  const expiryPage = await browser.newPage();
  await expiryPage.goto(
    `chrome-extension://${EXTENSION_ID}/link.html${relayParam}`,
    { waitUntil: 'load' },
  );
  await expiryPage.waitForSelector('#qr canvas', { timeout: 15_000 });
  await expiryPage.evaluate(() => {
    const originalSetTimeout = window.setTimeout;
    void originalSetTimeout;
  });
  const expiryText = await expiryPage.$eval(
    '#scan-status',
    node => node.textContent,
  );
  if (!expiryText || expiryText.trim().length === 0)
    throw new Error('scan status is empty; user has no feedback');
  console.log(
    `[harness] scan step surfaces status: "${expiryText.trim().slice(0, 60)}"`,
  );
  await expiryPage.close();

  await page.type('#pw1', PASSWORD);
  await page.type('#pw2', PASSWORD);
  await page.click('#pw-submit');
  await page.waitForSelector('#step-done:not(.hidden)', { timeout: 60_000 });
  await senderDone;
  console.log('[harness] import completed + acked');

  await page.goto(`chrome-extension://${EXTENSION_ID}/index.html`, {
    waitUntil: 'load',
  });
  await page.waitForFunction(
    () => (document.getElementById('root')?.children.length ?? 0) > 0,
    { timeout: 20_000 },
  );
  await new Promise(r => setTimeout(r, 2_500));
  const state = await page.evaluate(() => ({
    path: window.location.pathname,
    text: document.body.innerText.slice(0, 400).replace(/\n/g, ' | '),
  }));
  console.log(`[harness] app state after import: ${JSON.stringify(state)}`);
  await page.screenshot({ path: join(root, 'import-check.png') });

  const workerTarget = await browser.waitForTarget(
    t => t.type() === 'service_worker',
    { timeout: 15_000 },
  );
  const worker = await workerTarget.worker();
  await worker.evaluate(() => chrome.storage.session.remove('vaultSessionKey'));
  await page.waitForFunction(
    () => window.location.pathname.endsWith('unlock.html'),
    { timeout: 10_000 },
  );
  console.log('[harness] lock evicts the open page to unlock');
  await page.type('#pw', PASSWORD);
  await page.click('#pw-submit');
  await page.waitForFunction(
    () => window.location.pathname.endsWith('index.html'),
    { timeout: 15_000 },
  );
  console.log('[harness] lock -> unlock -> app roundtrip OK');

  // Settings custody controls (CEP-14): drive them from a real popup window,
  // mirroring production - lock closes every window holding an extension tab,
  // so the main harness page must sit on a neutral URL first.
  await page.goto('about:blank');
  await worker.evaluate(
    url =>
      chrome.windows.create({ url, type: 'popup', width: 420, height: 700 }),
    `chrome-extension://${EXTENSION_ID}/index.html`,
  );
  const popupTarget = await browser.waitForTarget(
    t => t.type() === 'page' && t.url().includes('index.html'),
    { timeout: 15_000 },
  );
  const popup = await popupTarget.page();
  await popup.waitForFunction(() => document.body.innerText.length > 20, {
    timeout: 20_000,
  });
  await popup.evaluate(() => {
    window.history.pushState({}, '', '/settings');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  const clickByText = text =>
    popup.evaluate(label => {
      const leaf = [...document.querySelectorAll('*')].find(
        el => el.children.length === 0 && el.textContent?.trim() === label,
      );
      if (!leaf) throw new Error(`no element with text "${label}"`);
      leaf.click();
    }, text);
  await popup.waitForFunction(
    () => document.body.innerText.includes('Lock extension'),
    { timeout: 15_000 },
  );
  await clickByText('Reset extension');
  await popup.waitForFunction(
    () => document.body.innerText.includes('Press again to confirm'),
    { timeout: 10_000 },
  );
  console.log('[harness] settings reset requires a second press');
  await clickByText('Lock extension');
  {
    const deadline = Date.now() + 15_000;
    while (!popup.isClosed() && Date.now() < deadline)
      await new Promise(resolve => setTimeout(resolve, 250));
    if (!popup.isClosed())
      throw new Error('settings lock did not close the popup window');
  }
  await page
    .goto(`chrome-extension://${EXTENSION_ID}/index.html`, {
      waitUntil: 'load',
    })
    .catch(() => {});
  await page.waitForFunction(
    () => window.location.pathname.endsWith('unlock.html'),
    { timeout: 15_000 },
  );
  console.log('[harness] settings lock closes the popup and locks the vault');
  await page.type('#pw', PASSWORD);
  await page.click('#pw-submit');
  await page.waitForFunction(
    () => window.location.pathname.endsWith('index.html'),
    { timeout: 15_000 },
  );

  await worker.evaluate(async () => {
    const record = await chrome.storage.session.get('vaultSessionKey');
    const session = record.vaultSessionKey;
    session.lastActivityAt = Date.now() - 31 * 60 * 1000;
    await chrome.storage.session.set({ vaultSessionKey: session });
  });
  await page
    .goto(`chrome-extension://${EXTENSION_ID}/index.html`, {
      waitUntil: 'load',
    })
    .catch(() => {});
  await page.waitForFunction(
    () => window.location.pathname.endsWith('unlock.html'),
    { timeout: 20_000 },
  );
  await page.type('#pw', PASSWORD);
  await page.click('#pw-submit');
  await page.waitForFunction(
    () => window.location.pathname.endsWith('index.html'),
    { timeout: 15_000 },
  );
  console.log('[harness] idle-expired session treated as locked');

  await worker.evaluate(() => chrome.storage.session.remove('vaultSessionKey'));
  await page.waitForFunction(
    () => window.location.pathname.endsWith('unlock.html'),
    { timeout: 10_000 },
  );
  await page.type('#pw', 'wrong-password');
  await page.click('#pw-submit');
  await page.waitForFunction(
    () => document.getElementById('pw-error')?.textContent?.includes('Wrong'),
    {
      timeout: 15_000,
    },
  );
  console.log('[harness] wrong password rejected');

  for (let attempt = 0; attempt < 3; attempt++) {
    await page.$eval('#pw', node => {
      node.value = '';
    });
    await page.type('#pw', `wrong-${attempt}`);
    await page.click('#pw-submit');
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  const throttleText = await page.$eval(
    '#pw-error',
    node => node.textContent ?? '',
  );
  if (!/wait \d+s|Try again in \d+s/i.test(throttleText)) {
    throw new Error(`expected a throttle message, got: ${throttleText}`);
  }
  console.log('[harness] unlock throttles after repeated failures');

  await page.click('#reset-start');
  await page.waitForSelector('#reset-confirm:not(.hidden)', { timeout: 5_000 });
  await page.click('#reset-confirm-btn');
  await page.waitForFunction(
    () => window.location.pathname.endsWith('link.html'),
    { timeout: 15_000 },
  );
  await page.waitForSelector('#qr canvas', { timeout: 15_000 });
  const metaGone = await worker.evaluate(async () => {
    const local = await chrome.storage.local.get(null);
    return (
      !('vaultMeta' in local) &&
      !('passkeyMeta' in local) &&
      Object.keys(local).every(k => !k.startsWith('vault:'))
    );
  });
  if (!metaGone) throw new Error('reset left vault data behind');
  console.log('[harness] reset wipes vault and returns to link page');

  await worker.evaluate(async () => {
    await chrome.storage.session.set({
      pendingSession: {
        sessionId: 'restart-probe',
        tabId: -1,
        origin: null,
        windowId: null,
        resolved: false,
      },
    });
  });
  const workerClient = await worker.client;
  await workerClient.send('ServiceWorker.stopAllWorkers').catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 1_000));
  const revived = await (
    await browser.waitForTarget(t => t.type() === 'service_worker', {
      timeout: 15_000,
    })
  ).worker();
  const survived = await revived.evaluate(async () => {
    const record = await chrome.storage.session.get('pendingSession');
    return record.pendingSession?.sessionId ?? null;
  });
  if (survived !== 'restart-probe')
    throw new Error(`pending session lost across worker restart: ${survived}`);
  await revived.evaluate(() => chrome.storage.session.remove('pendingSession'));
  console.log('[harness] pending session survives a worker restart');

  const fatal = errors.filter(e => !e.includes('WebSocket'));
  console.log(
    fatal.length === 0
      ? 'IMPORT CHECK OK'
      : `IMPORT CHECK FAILED: ${fatal.join('; ')}`,
  );
  process.exitCode = fatal.length === 0 ? 0 : 1;
} finally {
  await browser.close();
}
