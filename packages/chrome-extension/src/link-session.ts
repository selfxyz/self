// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Account-transfer receiver engine, UI-free: driven by the bridge custody
// domain. Owns the relayer sockets, the SAS handshake, envelope decryption,
// and vault persistence.
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import { io, type Socket } from 'socket.io-client';

import {
  deriveTransferKey,
  generateLinkSecret,
  sasEmojis,
  transferAad,
  type TransferBinding,
} from '@selfxyz/mobile-sdk-alpha/utils/sas';

import type { Envelope } from './crypto';
import {
  aesKeyFromSecret,
  decryptEnvelope,
  deriveSharedSecretBits,
  generateEcdhKeyPair,
  hex,
} from './crypto';
import { setupPasskeyVault } from './passkey';
import { createVault, initialize as initializeVault } from './vault';

const RELAY_DEFAULT = 'wss://websocket.staging.self.xyz';
const RELAY_ALLOWED = [
  'wss://websocket.self.xyz',
  'wss://websocket.staging.self.xyz',
];
export const QR_TTL_MS = 5 * 60_000;
const DERIVATION_PATH = "m/44'/60'/0'/0/0";

export function resolveRelay(requested: string | null): string {
  if (!requested) return RELAY_DEFAULT;
  if (RELAY_ALLOWED.includes(requested)) return requested;
  if (/^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requested))
    return requested;
  console.warn('Ignoring relay override outside the allowlist');
  return RELAY_DEFAULT;
}

interface TransferMessage {
  sessionId: string;
  transferType: string;
  senderPublicKey: string;
  envelope: Envelope;
}

export interface TransferPayload {
  version: number;
  linkedAt?: string;
  mnemonic: unknown;
  documentCatalog: { documents: unknown[]; selectedDocumentId?: string | null };
  documents: Record<string, unknown>;
}

export function extractMnemonicPhrase(raw: unknown): string {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as { phrase?: string };
      if (typeof parsed?.phrase === 'string') return parsed.phrase;
    } catch {
      return raw.trim();
    }
    return raw.trim();
  }
  if (
    raw &&
    typeof raw === 'object' &&
    typeof (raw as { phrase?: string }).phrase === 'string'
  ) {
    return (raw as { phrase: string }).phrase;
  }
  throw new Error('Unrecognized mnemonic format in transfer payload');
}

export function derivePrivateKey(phrase: string): string {
  const seed = mnemonicToSeedSync(phrase);
  const derived = HDKey.fromMasterSeed(seed).derive(DERIVATION_PATH);
  if (!derived.privateKey) throw new Error('Failed to derive private key');
  return '0x' + hex.encode(derived.privateKey);
}

export function validatePayload(payload: TransferPayload): {
  catalogSize: number;
} {
  if (!payload || typeof payload !== 'object')
    throw new Error('Payload is not an object');
  if (
    typeof payload.version !== 'number' ||
    payload.version < 1 ||
    payload.version > 1
  ) {
    throw new Error(
      `Unsupported transfer version ${String(payload.version)}; update this extension`,
    );
  }
  const catalog = payload.documentCatalog;
  if (!catalog || !Array.isArray(catalog.documents))
    throw new Error('Missing document catalog');
  if (!payload.documents || typeof payload.documents !== 'object')
    throw new Error('Missing documents map');
  for (const entry of catalog.documents) {
    const id = (entry as { id?: string })?.id;
    if (typeof id !== 'string' || !(id in payload.documents)) {
      throw new Error(`Catalog entry ${String(id)} has no matching document`);
    }
  }
  return { catalogSize: catalog.documents.length };
}

export async function persistDocuments(
  payload: TransferPayload,
): Promise<void> {
  const phrase = extractMnemonicPhrase(payload.mnemonic);
  const privateKey = derivePrivateKey(phrase);

  const vault = createVault();
  await vault.set('self_mnemonic', phrase);
  await vault.set('self_private_key', privateKey);
  await vault.set(
    'self_document_catalog',
    JSON.stringify(payload.documentCatalog),
  );
  await vault.set(
    'self_linked_at',
    payload.linkedAt ?? new Date().toISOString(),
  );
  for (const [id, doc] of Object.entries(payload.documents)) {
    await vault.set(`self_doc_${id}`, JSON.stringify(doc));
  }
}

export interface LinkEvent {
  stage: 'waiting' | 'hello' | 'imported' | 'expired' | 'done' | 'error';
  sas?: string[];
  docCount?: number;
  message?: string;
}

export interface LinkSessionHandle {
  qrContent: string;
  ttlMs: number;
  cancel(): void;
  /** Sets up custody and persists the pending import. Resolves to the document count. */
  complete(kind: 'password' | 'passkey', password?: string): Promise<number>;
}

export async function startLinkSession(
  relayParam: string | null,
  emit: (event: LinkEvent) => void,
): Promise<LinkSessionHandle> {
  const relay = resolveRelay(relayParam);
  const sessionId = crypto.randomUUID();
  const helloSessionId = crypto.randomUUID();
  const { keyPair, publicKeyHex } = await generateEcdhKeyPair();
  const linkSecret = generateLinkSecret();
  const qrContent = JSON.stringify({
    transferSessionId: sessionId,
    helloSessionId,
    receiverPublicKey: publicKeyHex,
    linkSecret,
    relay,
  });

  const socket: Socket = io(`${relay}/websocket`, {
    path: '/',
    transports: ['websocket'],
    forceNew: true,
    query: { sessionId, clientType: 'mobile' },
  });
  const helloSocket: Socket = io(`${relay}/websocket`, {
    path: '/',
    transports: ['websocket'],
    forceNew: true,
    query: { sessionId: helloSessionId, clientType: 'mobile' },
  });

  let expired = false;
  let handled = false;
  let cancelled = false;
  let helloSenderKey: string | null = null;
  let helloConflict = false;
  let pendingPayload: TransferPayload | null = null;
  let pendingDocCount = 0;

  const expireAt = setTimeout(() => {
    expired = true;
    socket.disconnect();
    helloSocket.disconnect();
    emit({ stage: 'expired' });
  }, QR_TTL_MS);

  const fail = (message: string) => emit({ stage: 'error', message });

  socket.on('connect', () => {
    if (!expired && !handled) emit({ stage: 'waiting' });
  });
  socket.on('connect_error', (err: Error) => {
    if (!handled)
      fail(
        `Cannot reach the Self relay: ${err.message}. Check your connection, then get a new code.`,
      );
  });
  socket.on('disconnect', (reason: string) => {
    if (expired || handled || cancelled) return;
    if (reason === 'io client disconnect') return;
    fail(
      `Connection to the Self relay dropped (${reason}). Get a new code if this persists.`,
    );
  });
  socket.on('error', (payload: { message?: string } | string) => {
    const message = typeof payload === 'string' ? payload : payload?.message;
    if (!handled)
      fail(
        `The Self relay rejected this session${message ? `: ${message}` : ''}. Get a new code.`,
      );
  });

  helloSocket.on('self_app', (data: unknown) => {
    void (async () => {
      const message = (
        typeof data === 'string' ? JSON.parse(data) : data
      ) as TransferMessage;
      if (
        message.sessionId !== helloSessionId ||
        message.transferType !== 'self-account-transfer-hello'
      )
        return;
      if (typeof message.senderPublicKey !== 'string') return;
      if (helloSenderKey && helloSenderKey !== message.senderPublicKey) {
        helloConflict = true;
        fail(
          'Conflicting handshakes on this code. Get a new code and start again.',
        );
        return;
      }
      try {
        const bits = await deriveSharedSecretBits(
          keyPair.privateKey,
          message.senderPublicKey,
        );
        const binding: TransferBinding = {
          sessionId,
          receiverPublicKey: publicKeyHex,
          senderPublicKey: message.senderPublicKey,
          linkSecret,
        };
        helloSenderKey = message.senderPublicKey;
        emit({ stage: 'hello', sas: sasEmojis(bits, binding) });
      } catch {
        fail('Received an invalid handshake. Rescan the code.');
      }
    })();
  });

  socket.on('self_app', (data: unknown) => {
    void (async () => {
      const message = (
        typeof data === 'string' ? JSON.parse(data) : data
      ) as TransferMessage;
      if (
        message.transferType !== 'self-account-transfer' ||
        message.sessionId !== sessionId
      )
        return;
      if (handled) return; // the phone re-emits on reconnect
      if (expired) {
        fail(
          'This code expired before the transfer arrived. Get a new code and try again.',
        );
        return;
      }
      if (helloConflict) return;
      if (!helloSenderKey) {
        fail(
          'Transfer arrived without a handshake. Get a new code and start again.',
        );
        return;
      }
      if (message.senderPublicKey !== helloSenderKey) {
        fail(
          'Transfer did not match the verified handshake. Get a new code and start again.',
        );
        return;
      }

      try {
        const sharedSecret = await deriveSharedSecretBits(
          keyPair.privateKey,
          message.senderPublicKey,
        );
        const binding: TransferBinding = {
          sessionId,
          receiverPublicKey: publicKeyHex,
          senderPublicKey: message.senderPublicKey,
          linkSecret,
        };
        const sharedKey = await aesKeyFromSecret(
          deriveTransferKey(sharedSecret, binding),
        );
        const plain = await decryptEnvelope(
          sharedKey,
          message.envelope,
          transferAad(binding),
        );
        const payload = JSON.parse(
          new TextDecoder().decode(plain),
        ) as TransferPayload;
        const { catalogSize } = validatePayload(payload);
        handled = true;
        clearTimeout(expireAt);
        helloSocket.disconnect();
        pendingPayload = payload;
        pendingDocCount = catalogSize;
        emit({
          stage: 'imported',
          sas: sasEmojis(sharedSecret, binding),
          docCount: catalogSize,
        });
      } catch (err) {
        fail(
          `Transfer failed: ${err instanceof Error ? err.message : String(err)}. Get a new code and try again.`,
        );
        socket.emit('proof_generation_failed', {
          session_id: sessionId,
          error_code: 'TRANSFER_DECRYPT_FAILED',
          reason: 'decrypt_or_validate',
        });
      }
    })();
  });

  return {
    qrContent,
    ttlMs: QR_TTL_MS,
    cancel() {
      cancelled = true;
      clearTimeout(expireAt);
      socket.disconnect();
      helloSocket.disconnect();
    },
    async complete(kind, password) {
      if (!pendingPayload) throw new Error('No transfer to secure yet');
      if (kind === 'password') {
        if (!password) throw new Error('Password required');
        await initializeVault(password);
      } else {
        await setupPasskeyVault();
      }
      await persistDocuments(pendingPayload);
      socket.emit('proof_verified', { session_id: sessionId });
      emit({ stage: 'done', docCount: pendingDocCount });
      setTimeout(() => socket.disconnect(), 1_000);
      return pendingDocCount;
    },
  };
}
