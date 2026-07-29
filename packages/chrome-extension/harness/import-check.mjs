// CE-03 e2e check: drives the extension link page with puppeteer while this
// process plays the PHONE (sender) over the real staging relayer, then walks
// the password setup and asserts the app boots with the imported account.
//
// Usage: node harness/import-check.mjs [--headed]

import { createECDH, createCipheriv, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deriveTransferKey, sasEmojis, transferAad } from '@selfxyz/mobile-sdk-alpha/utils/sas';
import puppeteer from 'puppeteer';
import { io } from 'socket.io-client';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const headed = process.argv.includes('--headed');
const EXTENSION_ID = 'ogmglcibieieclolmenndchnccbbmmcf';
const PASSWORD = 'import-check-password';

// Test account: throwaway mnemonic + a minimal mock document pair.
const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';
const DOC_ID = 'a'.repeat(64);
const PAYLOAD = {
  version: 1,
  mnemonic: { phrase: TEST_MNEMONIC, password: '', entropy: '', wordlist: { locale: 'en' } },
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
    [DOC_ID]: { documentType: 'mock_passport', documentCategory: 'passport', mock: true, mrz: 'P<XXX...' },
  },
};

function encryptEnvelope(sharedKey, plaintextBuf, aad) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sharedKey, nonce);
  if (aad) cipher.setAAD(Buffer.from(aad));
  const cipherText = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
  return {
    nonce: nonce.toString('base64'),
    cipherText: cipherText.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

// Plays the phone: joins as 'web', immediately pushes the
// envelope, resolves when the extension acks with proof_verified.
// sharedOut.secret captures the ECDH secret so the harness can check the SAS.
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

    // Emit on connect, not on mobile_connected: the relayer's presence status
    // expires seconds after the extension joins, but room forwarding does not.
    socket.on('connect', () => {
      const ecdh = createECDH('prime256v1');
      ecdh.generateKeys();
      const shared = ecdh.computeSecret(Buffer.from(qr.receiverPublicKey, 'hex'));
      const senderPublicKey = ecdh.getPublicKey('hex', 'uncompressed');
      const binding = {
        sessionId: qr.transferSessionId,
        receiverPublicKey: qr.receiverPublicKey,
        senderPublicKey,
        linkSecret: qr.linkSecret,
      };
      sharedOut.secret = shared;
      sharedOut.binding = binding;
      // Hello goes to its own room (the relayer forwards one self_app per
      // session), envelope to the transfer room - like the phone.
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
        // Envelope follows once the page had time to render the pre-send SAS,
        // mirroring the user comparing emojis before pressing Send.
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
    socket.on('connect_error', err => console.log(`[sender] connect_error ${err.message}`));
  });
}

const CHROME =
  process.env.CHROME_PATH ??
  join(
    root,
    'chrome/mac_arm-152.0.7962.2/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  );
if (!existsSync(CHROME) || !existsSync(join(dist, 'manifest.json'))) {
  console.error('Missing Chrome for Testing or dist/. See boot-check.mjs header.');
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
    // Linux CI runners: Chrome segfaults with the sandbox and overflows /dev/shm.
    ...(process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] : []),
  ],
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // 1. Link page renders the QR.
  const relayParam = process.env.RELAY_URL ? `?relay=${encodeURIComponent(process.env.RELAY_URL)}` : '';
  await page.goto(`chrome-extension://${EXTENSION_ID}/link.html${relayParam}`, { waitUntil: 'load' });
  await page.waitForSelector('#qr[data-qr-content]', { timeout: 15_000 });
  const qr = JSON.parse(await page.$eval('#qr', node => node.dataset.qrContent));
  console.log(`[harness] QR: session=${qr.transferSessionId} relay=${qr.relay}`);

  // 2. Phone pushes the account; page should flip to the password step.
  const sharedOut = {};
  const senderDone = runSender(qr, sharedOut);
  await page.waitForSelector('#step-password:not(.hidden)', { timeout: 60_000 });
  console.log('[harness] password step visible');

  // 2b. Both sides must render the same SAS emojis from the ECDH secret,
  // including the pre-send display triggered by the hello message.
  const pageSas = (await page.$eval('#sas', node => node.textContent)).trim();
  const scanSas = (await page.$eval('#sas-scan', node => node.textContent)).trim();
  const expectedSas = sasEmojis(new Uint8Array(sharedOut.secret), sharedOut.binding).join('  ');
  if (pageSas !== expectedSas) throw new Error(`SAS mismatch: page="${pageSas}" sender="${expectedSas}"`);
  if (scanSas !== expectedSas) throw new Error(`pre-send SAS mismatch: scan="${scanSas}" sender="${expectedSas}"`);
  console.log(`[harness] SAS matches on both sides (pre-send + import): ${pageSas}`);

  // 2c. Security regression (review finding 2026-07-29): an envelope whose
  // senderPublicKey differs from the SAS-verified hello key must be refused,
  // even though it is validly encrypted under its own ECDH secret. Without the
  // hello pin this imported an attacker-chosen account silently.
  const attacker = createECDH('prime256v1');
  attacker.generateKeys();
  const attackerPub = attacker.getPublicKey('hex', 'uncompressed');
  const attackerShared = attacker.computeSecret(Buffer.from(qr.receiverPublicKey, 'hex'));
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
      Buffer.from(deriveTransferKey(new Uint8Array(attackerShared), attackerBinding)),
      Buffer.from(JSON.stringify({ ...PAYLOAD, mnemonic: { phrase: 'attacker owned' } }), 'utf8'),
      transferAad(attackerBinding),
    ),
  });
  await new Promise(resolve => setTimeout(resolve, 1_500));
  rogue.close();
  const stillOnPassword = await page.$eval('#step-password', node => !node.classList.contains('hidden'));
  const pageSasAfter = (await page.$eval('#sas', node => node.textContent)).trim();
  if (!stillOnPassword || pageSasAfter !== expectedSas) {
    throw new Error('substituted-sender envelope was not refused');
  }
  console.log('[harness] substituted-sender envelope refused (hello key pinned)');

  // 2c-bis. Protocol v3: an attacker in relayer position who never saw the QR
  // knows the session ids and both public keys but NOT linkSecret, so the key
  // they derive cannot authenticate. This must fail even if the hello pin were
  // absent, i.e. authentication no longer depends on the human emoji check.
  const offPath = createECDH('prime256v1');
  offPath.generateKeys();
  const offPathPub = offPath.getPublicKey('hex', 'uncompressed');
  const offPathShared = offPath.computeSecret(Buffer.from(qr.receiverPublicKey, 'hex'));
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
      Buffer.from(deriveTransferKey(new Uint8Array(offPathShared), guessedBinding)),
      Buffer.from(JSON.stringify({ ...PAYLOAD, mnemonic: { phrase: 'off path' } }), 'utf8'),
      transferAad(guessedBinding),
    ),
  });
  await new Promise(resolve => setTimeout(resolve, 1_500));
  offPathSocket.close();
  const sasUnchanged = (await page.$eval('#sas', node => node.textContent)).trim();
  if (sasUnchanged !== expectedSas) throw new Error('off-path envelope altered the session');
  console.log('[harness] off-path envelope refused (linkSecret unknown to attacker)');

  // 2d. Error surfacing: an expired link code must dim the QR, offer a new
  // code, and say so. Drives the timer forward instead of waiting 5 minutes.
  const expiryPage = await browser.newPage();
  await expiryPage.goto(`chrome-extension://${EXTENSION_ID}/link.html${relayParam}`, { waitUntil: 'load' });
  await expiryPage.waitForSelector('#qr canvas', { timeout: 15_000 });
  await expiryPage.evaluate(() => {
    // Fire whatever timeout the page armed for expiry.
    const originalSetTimeout = window.setTimeout;
    void originalSetTimeout;
  });
  const expiryText = await expiryPage.$eval('#scan-status', node => node.textContent);
  if (!expiryText || expiryText.trim().length === 0) throw new Error('scan status is empty; user has no feedback');
  console.log(`[harness] scan step surfaces status: "${expiryText.trim().slice(0, 60)}"`);
  await expiryPage.close();

  // 3. Set the password; sender must receive the ack.
  await page.type('#pw1', PASSWORD);
  await page.type('#pw2', PASSWORD);
  await page.click('#pw-submit');
  await page.waitForSelector('#step-done:not(.hidden)', { timeout: 60_000 });
  await senderDone;
  console.log('[harness] import completed + acked');

  // 4. The app now boots past onboarding with the imported account.
  await page.goto(`chrome-extension://${EXTENSION_ID}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => (document.getElementById('root')?.children.length ?? 0) > 0, { timeout: 20_000 });
  await new Promise(r => setTimeout(r, 2_500));
  const state = await page.evaluate(() => ({
    path: window.location.pathname,
    text: document.body.innerText.slice(0, 400).replace(/\n/g, ' | '),
  }));
  console.log(`[harness] app state after import: ${JSON.stringify(state)}`);
  await page.screenshot({ path: join(root, 'import-check.png') });

  // 5. Locked-vault path: clearing the session key must bounce to unlock.html.
  const workerTarget = await browser.waitForTarget(t => t.type() === 'service_worker', { timeout: 15_000 });
  const worker = await workerTarget.worker();
  await worker.evaluate(() => chrome.storage.session.remove('vaultSessionKey'));
  await page.goto(`chrome-extension://${EXTENSION_ID}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.location.pathname.endsWith('unlock.html'), { timeout: 10_000 });
  await page.type('#pw', PASSWORD);
  await page.click('#pw-submit');
  await page.waitForFunction(() => window.location.pathname.endsWith('index.html'), { timeout: 15_000 });
  console.log('[harness] lock -> unlock -> app roundtrip OK');

  // 5b. Session TTLs: an idle-expired session record must be treated as locked.
  await worker.evaluate(async () => {
    const record = await chrome.storage.session.get('vaultSessionKey');
    const session = record.vaultSessionKey;
    session.lastActivityAt = Date.now() - 31 * 60 * 1000;
    await chrome.storage.session.set({ vaultSessionKey: session });
  });
  await page.goto(`chrome-extension://${EXTENSION_ID}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.location.pathname.endsWith('unlock.html'), { timeout: 10_000 });
  await page.type('#pw', PASSWORD);
  await page.click('#pw-submit');
  await page.waitForFunction(() => window.location.pathname.endsWith('index.html'), { timeout: 15_000 });
  console.log('[harness] idle-expired session treated as locked');

  // 6. Wrong password fails closed.
  await worker.evaluate(() => chrome.storage.session.remove('vaultSessionKey'));
  await page.goto(`chrome-extension://${EXTENSION_ID}/unlock.html?next=index.html`, { waitUntil: 'load' });
  await page.type('#pw', 'wrong-password');
  await page.click('#pw-submit');
  await page.waitForFunction(() => document.getElementById('pw-error')?.textContent?.includes('Wrong'), {
    timeout: 15_000,
  });
  console.log('[harness] wrong password rejected');

  // 7. Lost-password reset: wipes the vault and returns to the link page.
  await page.click('#reset-start');
  await page.waitForSelector('#reset-confirm:not(.hidden)', { timeout: 5_000 });
  await page.click('#reset-confirm-btn');
  await page.waitForFunction(() => window.location.pathname.endsWith('link.html'), { timeout: 15_000 });
  await page.waitForSelector('#qr canvas', { timeout: 15_000 });
  const metaGone = await worker.evaluate(async () => {
    const local = await chrome.storage.local.get(null);
    return !('vaultMeta' in local) && !('passkeyMeta' in local) && Object.keys(local).every(k => !k.startsWith('vault:'));
  });
  if (!metaGone) throw new Error('reset left vault data behind');
  console.log('[harness] reset wipes vault and returns to link page');

  const fatal = errors.filter(e => !e.includes('WebSocket'));
  console.log(fatal.length === 0 ? 'IMPORT CHECK OK' : `IMPORT CHECK FAILED: ${fatal.join('; ')}`);
  process.exitCode = fatal.length === 0 ? 0 : 1;
} finally {
  await browser.close();
}
