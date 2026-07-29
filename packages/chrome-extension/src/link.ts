// Link page: receives the account from the phone and stores it encrypted.
//
// Protocol (specs/.../plans/CE-01-transfer-protocol.md): this page is the
// RECEIVER. It renders a QR {transferSessionId, receiverPublicKey}, joins the
// relayer room as clientType 'mobile', and waits for the phone (joined as
// 'web') to push the encrypted envelope via the `self_app` event. After
// decrypt + password setup it acks with `proof_verified` so the phone shows
// success.

import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import QRCode from 'qrcode';
import { io, type Socket } from 'socket.io-client';

import {
  deriveTransferKey,
  generateLinkSecret,
  sasEmojis,
  transferAad,
  type TransferBinding,
} from '@selfxyz/mobile-sdk-alpha/utils/sas';

import type { Envelope } from './crypto';
import { aesKeyFromSecret, decryptEnvelope, deriveSharedSecretBits, generateEcdhKeyPair, hex } from './crypto';
import { enablePasskeyUnlock, setupPasskeyVault } from './passkey';
import { initialize as initializeVault, createVault, MIN_PASSWORD_LENGTH, passwordStrength } from './vault';

const RELAY_DEFAULT = 'wss://websocket.staging.self.xyz';
// Relay host allowlist: an attacker-supplied relay would hand them the
// transport (session ids, payload sizes, message ordering). wss only.
const RELAY_ALLOWED = ['wss://websocket.self.xyz', 'wss://websocket.staging.self.xyz'];
// A link code is a live capability: expire it so a QR left on screen (or in a
// screenshot) stops being usable.
const QR_TTL_MS = 5 * 60_000;

function resolveRelay(requested: string | null): string {
  if (!requested) return RELAY_DEFAULT;
  if (RELAY_ALLOWED.includes(requested)) return requested;
  // Local dev/harness override, never a remote host.
  if (/^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requested)) return requested;
  console.warn('Ignoring relay override outside the allowlist');
  return RELAY_DEFAULT;
}
const DERIVATION_PATH = "m/44'/60'/0'/0/0";

interface TransferMessage {
  sessionId: string;
  transferType: string;
  senderPublicKey: string;
  envelope: Envelope;
}

interface TransferPayload {
  version: number;
  mnemonic: unknown;
  documentCatalog: { documents: unknown[]; selectedDocumentId?: string | null };
  documents: Record<string, unknown>;
}

const el = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
};

function show(step: 'scan' | 'password' | 'done'): void {
  el('step-scan').classList.toggle('hidden', step !== 'scan');
  el('step-password').classList.toggle('hidden', step !== 'password');
  el('step-done').classList.toggle('hidden', step !== 'done');
}

function extractMnemonicPhrase(raw: unknown): string {
  // The phone sends the keychain 'secret' entry as stored: either an
  // ethers.Mnemonic JSON object or a bare phrase string.
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as { phrase?: string };
      if (typeof parsed?.phrase === 'string') return parsed.phrase;
    } catch {
      return raw.trim();
    }
    return raw.trim();
  }
  if (raw && typeof raw === 'object' && typeof (raw as { phrase?: string }).phrase === 'string') {
    return (raw as { phrase: string }).phrase;
  }
  throw new Error('Unrecognized mnemonic format in transfer payload');
}

function derivePrivateKey(phrase: string): string {
  const seed = mnemonicToSeedSync(phrase);
  const derived = HDKey.fromMasterSeed(seed).derive(DERIVATION_PATH);
  if (!derived.privateKey) throw new Error('Failed to derive private key');
  return '0x' + hex.encode(derived.privateKey);
}

function validatePayload(payload: TransferPayload): { catalogSize: number } {
  if (!payload || typeof payload !== 'object') throw new Error('Payload is not an object');
  const catalog = payload.documentCatalog;
  if (!catalog || !Array.isArray(catalog.documents)) throw new Error('Missing document catalog');
  if (!payload.documents || typeof payload.documents !== 'object') throw new Error('Missing documents map');
  for (const entry of catalog.documents) {
    const id = (entry as { id?: string })?.id;
    if (typeof id !== 'string' || !(id in payload.documents)) {
      throw new Error(`Catalog entry ${String(id)} has no matching document`);
    }
  }
  return { catalogSize: catalog.documents.length };
}

/** Writes the account into the vault; the vault must already be initialized and unlocked. */
async function persistDocuments(payload: TransferPayload): Promise<void> {
  const phrase = extractMnemonicPhrase(payload.mnemonic);
  const privateKey = derivePrivateKey(phrase);

  const vault = createVault();
  await vault.set('self_mnemonic', phrase);
  await vault.set('self_private_key', privateKey);
  await vault.set('self_document_catalog', JSON.stringify(payload.documentCatalog));
  for (const [id, doc] of Object.entries(payload.documents)) {
    await vault.set(`self_doc_${id}`, JSON.stringify(doc));
  }
}

async function main(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const relay = resolveRelay(params.get('relay'));

  const sessionId = crypto.randomUUID();
  // Separate room for the pre-send SAS handshake: the relayer forwards only
  // the FIRST self_app per session, so the hello cannot share the transfer room.
  const helloSessionId = crypto.randomUUID();
  const { keyPair, publicKeyHex } = await generateEcdhKeyPair();
  // Out-of-band channel authentication: this secret rides the QR only, never
  // the relayer, and salts the envelope key. Only a device that scanned the
  // code can produce an envelope that authenticates.
  const linkSecret = generateLinkSecret();
  const qrContent = JSON.stringify({
    transferSessionId: sessionId,
    helloSessionId,
    receiverPublicKey: publicKeyHex,
    linkSecret,
    relay,
  });

  const canvas = document.createElement('canvas');
  const qrHost = el('qr');
  qrHost.dataset.qrContent = qrContent; // automation hook for the import harness
  qrHost.appendChild(canvas);
  await QRCode.toCanvas(canvas, qrContent, { width: 260, margin: 1 });

  el<HTMLButtonElement>('copy-payload').addEventListener('click', () => {
    void navigator.clipboard.writeText(qrContent);
    status('Code copied. Paste it in the Self app dev screen.');
  });

  const socket: Socket = io(`${relay}/websocket`, {
    path: '/',
    transports: ['websocket'],
    forceNew: true,
    query: { sessionId, clientType: 'mobile' },
  });

  const status = (text: string) => {
    el('scan-status').textContent = text;
  };

  // Every terminal or degraded state gets a line the user can act on. A silent
  // spinner is a bug: the scan step can fail from the relayer, from expiry, or
  // from a hostile handshake, and each needs different user action.
  let expired = false;
  const expireAt = setTimeout(() => {
    expired = true;
    socket.disconnect();
    helloSocket.disconnect();
    el('qr').style.opacity = '0.25';
    el('regenerate').classList.remove('hidden');
    status('This code expired for your safety. Get a new one to link.');
  }, QR_TTL_MS);

  el<HTMLButtonElement>('regenerate').addEventListener('click', () => {
    window.location.reload();
  });

  socket.on('connect', () => {
    if (!expired) status('Waiting for your phone. Open Self and scan this code.');
  });
  socket.on('connect_error', (err: Error) => {
    status(`Cannot reach the Self relay: ${err.message}. Check your connection, then get a new code.`);
    el('regenerate').classList.remove('hidden');
  });
  socket.on('disconnect', (reason: string) => {
    if (expired || handled) return;
    status(`Connection to the Self relay dropped (${reason}). Reconnecting; get a new code if this persists.`);
    el('regenerate').classList.remove('hidden');
  });
  // The relayer rejects malformed joins with its own `error` event.
  socket.on('error', (payload: { message?: string } | string) => {
    const message = typeof payload === 'string' ? payload : payload?.message;
    status(`The Self relay rejected this session${message ? `: ${message}` : ''}. Get a new code.`);
    el('regenerate').classList.remove('hidden');
  });

  const helloSocket: Socket = io(`${relay}/websocket`, {
    path: '/',
    transports: ['websocket'],
    forceNew: true,
    query: { sessionId: helloSessionId, clientType: 'mobile' },
  });

  let helloSenderKey: string | null = null;
  let helloConflict = false;
  let handled = false;

  helloSocket.on('self_app', (data: unknown) => {
    void (async () => {
      const message = (typeof data === 'string' ? JSON.parse(data) : data) as TransferMessage;
      if (message.sessionId !== helloSessionId || message.transferType !== 'self-account-transfer-hello') return;
      if (typeof message.senderPublicKey !== 'string') return;
      if (helloSenderKey && helloSenderKey !== message.senderPublicKey) {
        // A second, different hello means someone else is talking to this
        // session. Refuse rather than showing a SAS the user might accept.
        status('Conflicting handshakes on this code. Close this window and start again.');
        helloConflict = true;
        return;
      }
      try {
        const bits = await deriveSharedSecretBits(keyPair.privateKey, message.senderPublicKey);
        const binding: TransferBinding = {
          sessionId,
          receiverPublicKey: publicKeyHex,
          senderPublicKey: message.senderPublicKey,
          linkSecret,
        };
        helloSenderKey = message.senderPublicKey;
        el('sas-scan').textContent = sasEmojis(bits, binding).join('  ');
        status('Check that your phone shows the same emojis, then press "Send account" on the phone.');
      } catch {
        status('Received an invalid handshake. Rescan the code.');
      }
    })();
  });

  socket.on('self_app', (data: unknown) => {
    void (async () => {
      const message = (typeof data === 'string' ? JSON.parse(data) : data) as TransferMessage;
      if (message.transferType !== 'self-account-transfer' || message.sessionId !== sessionId) return;
      if (handled) return; // the phone re-emits on reconnect
      if (expired) {
        status('This code expired before the transfer arrived. Get a new code and try again.');
        return;
      }

      // The envelope must come from the same ephemeral key whose SAS the user
      // compared. Without this pin, anyone who can reach the transfer room and
      // read the QR could substitute their own keypair and account.
      if (helloConflict) return;
      if (!helloSenderKey) {
        status('Transfer arrived without a handshake. Close this window and start again.');
        return;
      }
      if (message.senderPublicKey !== helloSenderKey) {
        status('Transfer did not match the verified handshake. Close this window and start again.');
        return;
      }

      try {
        const sharedSecret = await deriveSharedSecretBits(keyPair.privateKey, message.senderPublicKey);
        const binding: TransferBinding = {
          sessionId,
          receiverPublicKey: publicKeyHex,
          senderPublicKey: message.senderPublicKey,
          linkSecret,
        };
        const sharedKey = await aesKeyFromSecret(deriveTransferKey(sharedSecret, binding));
        const plain = await decryptEnvelope(sharedKey, message.envelope, transferAad(binding));
        const payload = JSON.parse(new TextDecoder().decode(plain)) as TransferPayload;
        const { catalogSize } = validatePayload(payload);
        // Latch only once the payload is authenticated: a junk first message
        // must not burn the session.
        handled = true;
        clearTimeout(expireAt);
        helloSocket.disconnect();

        el('sas').textContent = sasEmojis(sharedSecret, binding).join('  ');
        show('password');

        const finish = (custody: 'passkey' | 'password') => {
          socket.emit('proof_verified', { session_id: sessionId });
          el('done-summary').textContent =
            `${catalogSize} document${catalogSize === 1 ? '' : 's'} imported and encrypted. ` +
            'You can close the Self app on your phone.';
          if (custody === 'passkey') el('enable-passkey').classList.add('hidden');
          show('done');
          setTimeout(() => socket.disconnect(), 1_000);
        };

        const pw1El = el<HTMLInputElement>('pw1');
        const meter = el('pw-strength');
        const renderStrength = () => {
          if (!pw1El.value) {
            meter.textContent = '';
            return;
          }
          const { score, label } = passwordStrength(pw1El.value);
          meter.textContent = label;
          meter.style.color = score === 0 ? 'var(--danger, #ff6b6b)' : score >= 2 ? '#46AA44' : '#8A6A1F';
        };
        pw1El.addEventListener('input', renderStrength);

        const securePasskey = el<HTMLButtonElement>('secure-passkey');
        const submit = el<HTMLButtonElement>('pw-submit');
        const error = el('pw-error');

        securePasskey.addEventListener('click', () => {
          void (async () => {
            securePasskey.disabled = true;
            submit.disabled = true;
            error.textContent = '';
            try {
              await setupPasskeyVault();
              await persistDocuments(payload);
              finish('passkey');
            } catch (err) {
              securePasskey.disabled = false;
              submit.disabled = false;
              error.textContent = err instanceof Error ? err.message : String(err);
            }
          })();
        });

        submit.addEventListener('click', () => {
          void (async () => {
            const pw1 = el<HTMLInputElement>('pw1').value;
            const pw2 = el<HTMLInputElement>('pw2').value;
            if (pw1.length < MIN_PASSWORD_LENGTH) {
              error.textContent = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
              return;
            }
            if (pw1 !== pw2) {
              error.textContent = 'Passwords do not match.';
              return;
            }
            submit.disabled = true;
            securePasskey.disabled = true;
            error.textContent = '';
            try {
              await initializeVault(pw1);
              await persistDocuments(payload);
              finish('password');
            } catch (err) {
              submit.disabled = false;
              securePasskey.disabled = false;
              error.textContent = err instanceof Error ? err.message : String(err);
            }
          })();
        });
      } catch (err) {
        status(`Transfer failed: ${err instanceof Error ? err.message : String(err)}. Get a new code and try again.`);
        el('regenerate').classList.remove('hidden');
        socket.emit('proof_generation_failed', {
          session_id: sessionId,
          error_code: 'TRANSFER_DECRYPT_FAILED',
          reason: 'decrypt_or_validate',
        });
      }
    })();
  });

  el<HTMLButtonElement>('open-app').addEventListener('click', () => {
    window.location.href = chrome.runtime.getURL('index.html');
  });

  const passkeyBtn = el<HTMLButtonElement>('enable-passkey');
  passkeyBtn.addEventListener('click', () => {
    void (async () => {
      passkeyBtn.disabled = true;
      const status = el('passkey-status');
      status.textContent = '';
      try {
        await enablePasskeyUnlock();
        passkeyBtn.classList.add('hidden');
        status.textContent = 'Touch ID unlock enabled. Next unlock will offer it.';
      } catch (err) {
        passkeyBtn.disabled = false;
        status.textContent = err instanceof Error ? err.message : String(err);
      }
    })();
  });
}

void main();
