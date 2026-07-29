// CE-01 harness: proves an E2E-encrypted account payload can travel between two
// relayer clients in the same session room (phone -> extension direction).
//
// Sender plays the phone (joins as clientType 'web', pushes the envelope).
// Receiver plays the extension (joins as clientType 'mobile', listens).
//
// Usage: node harness/relayer-transfer.mjs [--relay wss://websocket.staging.self.xyz] [--size 120]
//   --size is the plaintext payload size in KB.

import { createECDH, createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { deriveTransferKey, transferAad } from '@selfxyz/mobile-sdk-alpha/utils/sas';
import { io } from 'socket.io-client';

const args = process.argv.slice(2);
const argOf = flag => {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
};
const RELAY = argOf('--relay') ?? 'wss://websocket.staging.self.xyz';
const SIZE_KB = Number(argOf('--size') ?? 120);
const CUSTOM_EVENT = 'account_transfer';
const OVERALL_TIMEOUT_MS = 30_000;

// Envelope crypto: mirrors the TEE handshake convention in common/src/utils/proving.ts
// (P-256 ECDH, shared key = x-coordinate as 32 bytes BE, AES-256-GCM, 12-byte nonce,
// 128-bit tag) but encodes fields as base64 instead of byte arrays to keep the JSON small.
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

function decryptEnvelope(sharedKey, envelope, aad) {
  const decipher = createDecipheriv('aes-256-gcm', sharedKey, Buffer.from(envelope.nonce, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
  if (aad) decipher.setAAD(Buffer.from(aad));
  return Buffer.concat([decipher.update(Buffer.from(envelope.cipherText, 'base64')), decipher.final()]);
}

function connect(sessionId, clientType) {
  return io(`${RELAY}/websocket`, {
    path: '/',
    transports: ['websocket'],
    forceNew: true,
    query: { sessionId, clientType },
  });
}

const sha = buf => createHash('sha256').update(buf).digest('hex');
const log = (who, msg) => console.log(`[${who}] ${msg}`);

async function run() {
  const sessionId = randomUUID();
  log('setup', `relay=${RELAY} sessionId=${sessionId} payload=${SIZE_KB}KB`);

  // Receiver = extension side. Its keypair is what the QR would carry.
  const receiverEcdh = createECDH('prime256v1');
  receiverEcdh.generateKeys();
  const qrContent = {
    transferSessionId: sessionId,
    receiverPublicKey: receiverEcdh.getPublicKey('hex', 'uncompressed'),
    linkSecret: randomBytes(32).toString('base64'),
  };
  log('receiver', `QR content: ${JSON.stringify(qrContent).length} bytes`);

  // Fake account payload of realistic size.
  const payload = Buffer.from(
    JSON.stringify({
      mnemonic: 'test '.repeat(24).trim(),
      documentCatalog: { documents: [], selectedDocumentId: null },
      padding: randomBytes(Math.floor((SIZE_KB * 1024 * 3) / 4)).toString('base64'),
    }),
    'utf8'
  );
  const payloadHash = sha(payload);
  log('sender', `plaintext ${payload.length} bytes, sha256=${payloadHash.slice(0, 16)}…`);

  const results = { customEventDelivered: false, selfAppDelivered: false, decryptOk: false };
  const receiver = connect(sessionId, 'mobile');
  let sender;

  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for delivery')), OVERALL_TIMEOUT_MS);

    const finish = () => {
      clearTimeout(timer);
      resolve();
    };

    receiver.on(CUSTOM_EVENT, () => {
      results.customEventDelivered = true;
      log('receiver', `custom event '${CUSTOM_EVENT}' WAS forwarded by the relayer`);
    });

    receiver.on('self_app', data => {
      const msg = typeof data === 'string' ? JSON.parse(data) : data;
      if (msg.sessionId !== sessionId || msg.transferType !== 'self-account-transfer') {
        log('receiver', 'ignoring non-transfer self_app payload');
        return;
      }
      results.selfAppDelivered = true;
      const shared = receiverEcdh.computeSecret(Buffer.from(msg.senderPublicKey, 'hex'));
      const binding = {
        sessionId,
        receiverPublicKey: qrContent.receiverPublicKey,
        senderPublicKey: msg.senderPublicKey,
        linkSecret: qrContent.linkSecret,
      };
      try {
        const plain = decryptEnvelope(
          Buffer.from(deriveTransferKey(new Uint8Array(shared), binding)),
          msg.envelope,
          transferAad(binding),
        );
        results.decryptOk = sha(plain) === payloadHash;
        log('receiver', `self_app envelope received (${JSON.stringify(msg).length} bytes on the wire), decrypt ${results.decryptOk ? 'OK, hash matches' : 'FAILED'}`);
      } catch (err) {
        log('receiver', `decrypt threw: ${err.message}`);
      }
      finish();
    });

    receiver.on('connect', () => {
      log('receiver', 'connected as clientType=mobile, now connecting sender');
      sender = connect(sessionId, 'web');

      // Emit on connect, not on mobile_connected: the relayer's presence status
      // expires seconds after the mobile client joins, but room forwarding does not.
      sender.on('connect', () => {
        log('sender', 'connected as clientType=web, emitting immediately');
        const senderEcdh = createECDH('prime256v1');
        senderEcdh.generateKeys();
        const shared = senderEcdh.computeSecret(Buffer.from(qrContent.receiverPublicKey, 'hex'));
        const senderPublicKey = senderEcdh.getPublicKey('hex', 'uncompressed');
        const binding = {
          sessionId,
          receiverPublicKey: qrContent.receiverPublicKey,
          senderPublicKey,
          linkSecret: qrContent.linkSecret,
        };
        const message = {
          sessionId,
          transferType: 'self-account-transfer',
          senderPublicKey,
          envelope: encryptEnvelope(
            Buffer.from(deriveTransferKey(new Uint8Array(shared), binding)),
            payload,
            transferAad(binding),
          ),
        };
        log('sender', `emitting '${CUSTOM_EVENT}' (probe) then 'self_app' (${JSON.stringify(message).length} bytes)`);
        sender.emit(CUSTOM_EVENT, { sessionId, probe: true });
        sender.emit('self_app', message);
      });
      sender.on('mobile_status', data => log('sender', `mobile_status: ${data?.status}`));
      sender.on('connect_error', err => log('sender', `connect_error: ${err.message}`));
    });

    receiver.on('connect_error', err => {
      clearTimeout(timer);
      reject(new Error(`receiver connect_error: ${err.message}`));
    });
  });

  try {
    await done;
  } finally {
    receiver.close();
    sender?.close();
  }

  console.log('\n=== CE-01 result ===');
  console.log(`custom event forwarded: ${results.customEventDelivered}`);
  console.log(`self_app forwarded:     ${results.selfAppDelivered}`);
  console.log(`decrypt + hash match:   ${results.decryptOk}`);
  if (!results.decryptOk) process.exit(1);
}

run().catch(err => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
