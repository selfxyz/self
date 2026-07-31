import { spawn } from 'node:child_process';
import { createECDH, createCipheriv, randomBytes } from 'node:crypto';
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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const demoRoot = resolve(root, '../extension-demo');
const dist = join(root, 'dist');
const headed = process.argv.includes('--headed');
const EXTENSION_ID = 'ogmglcibieieclolmenndchnccbbmmcf';
const PASSWORD = 'demo-check-password';
const DEMO_URL = 'http://localhost:5199';

const DOC_ID = 'c'.repeat(64);
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

function spawnServer(command, args, cwd, readyMatch) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(
      () =>
        reject(new Error(`${command} ${args.join(' ')} never became ready`)),
      60_000,
    );
    const onData = chunk => {
      const text = chunk.toString();
      if (text.match(readyMatch)) {
        clearTimeout(timer);
        resolvePromise(child);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', code =>
      reject(new Error(`server exited early (${code})`)),
    );
  });
}

const CHROME = join(
  root,
  'chrome/mac_arm-152.0.7962.2/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
if (!existsSync(CHROME) || !existsSync(join(dist, 'manifest.json'))) {
  console.error('Missing Chrome for Testing or dist/.');
  process.exit(1);
}

const servers = [];
let browser;
try {
  servers.push(
    await spawnServer('node', ['backend/server.mjs'], demoRoot, /listening on/),
  );
  servers.push(await spawnServer('pnpm', ['dev'], demoRoot, /localhost:5199/));
  console.log('[harness] demo backend + frontend up');

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: !headed,
    userDataDir: join(tmpdir(), `self-ext-demo-${Date.now()}`),
    args: [
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      '--no-first-run',
    ],
  });

  const setup = await browser.newPage();
  await setup.goto(`chrome-extension://${EXTENSION_ID}/link.html`, {
    waitUntil: 'load',
  });
  await setup.waitForSelector('#qr[data-qr-content]', { timeout: 15_000 });
  const qr = JSON.parse(
    await setup.$eval('#qr', node => node.dataset.qrContent),
  );
  const importDone = importAccount(qr);
  await setup.waitForSelector('#step-password:not(.hidden)', {
    timeout: 60_000,
  });
  await setup.type('#pw1', PASSWORD);
  await setup.type('#pw2', PASSWORD);
  await setup.click('#pw-submit');
  await setup.waitForSelector('#step-done:not(.hidden)', { timeout: 30_000 });
  await importDone;
  await setup.close();
  console.log('[harness] account imported');

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn')
      console.log(`[demo:${msg.type()}] ${msg.text().slice(0, 200)}`);
  });
  page.on('pageerror', err =>
    console.log(`[demo:pageerror] ${err.message.slice(0, 300)}`),
  );
  await page.goto(DEMO_URL, { waitUntil: 'networkidle2' });
  try {
    await page.waitForFunction(
      () => document.body.innerText.includes('Verify with the Self extension'),
      { timeout: 20_000 },
    );
  } catch (err) {
    const body = await page.evaluate(() =>
      document.body.innerText.replace(/\n/g, ' | ').slice(0, 400),
    );
    await page.screenshot({ path: join(root, 'demo-page.png') });
    throw new Error(`extension button never rendered; page shows: ${body}`);
  }
  console.log('[harness] shim detected the extension (button rendered)');
  await page.screenshot({ path: join(root, 'demo-page.png') });

  const popupPromise = new Promise(resolvePromise => {
    browser.once('targetcreated', target => resolvePromise(target));
  });
  await page.click('button');
  const popupTarget = await popupPromise;
  const popupUrl = popupTarget.url();
  console.log(`[harness] popup opened: ${popupUrl.slice(0, 110)}…`);
  if (
    !popupUrl.includes('ext_mode=embed') ||
    !popupUrl.includes('verificationId=')
  ) {
    throw new Error('popup URL missing embed params');
  }
  const sessionId = await page.evaluate(
    () => document.body.innerText.match(/session ([0-9a-f-]{36})/)?.[1],
  );
  if (sessionId && !popupUrl.includes(sessionId))
    throw new Error('popup session differs from page session');

  const busy = await page.evaluate(async () => {
    const mod = { requestVerification: null };
    return await new Promise(resolveInner => {
      function onMessage(event) {
        const data = event.data;
        if (
          data?.type === 'self:ext:result' &&
          data.sessionId === 'overlap-probe-session'
        ) {
          window.removeEventListener('message', onMessage);
          resolveInner(data.result?.error?.code ?? 'NO_ERROR');
        }
      }
      window.addEventListener('message', onMessage);
      window.postMessage(
        {
          type: 'self:ext:request',
          selfApp: {
            sessionId: 'overlap-probe-session',
            scope: 's',
            userId: 'u',
          },
        },
        window.origin,
      );
      setTimeout(() => resolveInner('TIMEOUT'), 5000);
    });
  });
  if (busy !== 'BUSY')
    throw new Error(`overlap probe expected BUSY, got ${busy}`);
  console.log('[harness] overlapping request rejected with BUSY');

  const popupPage = await popupTarget.page();
  await popupPage.close();
  await page.waitForFunction(
    () => document.body.innerText.includes('USER_CANCELLED'),
    { timeout: 20_000 },
  );
  console.log('[harness] page received USER_CANCELLED through the shim');
  await page.screenshot({ path: join(root, 'demo-cancelled.png') });

  console.log('DEMO WIRING OK');
} finally {
  await browser?.close();
  for (const server of servers) server.kill('SIGTERM');
}
