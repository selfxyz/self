// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Dev-only: sends the full account (mnemonic + document catalog + documents)
// to the Self browser extension, end-to-end encrypted through the websocket
// relayer. Protocol: specs/projects/sdk/workstreams/chrome-extension/plans/
// CE-01-transfer-protocol.md. The extension is the receiver ('mobile' client);
// this screen is the sender ('web' client) and treats the extension's
// `proof_verified` status as the delivery ack.

import { Buffer } from 'buffer';
import forge from 'node-forge';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';

import { ec } from '@selfxyz/common/utils/proving';
import {
  black,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import {
  deriveTransferKey,
  isValidLinkSecret,
  sasEmojis,
  transferAad,
  type TransferBinding,
} from '@selfxyz/mobile-sdk-alpha/utils/sas';

import { QRCodeScannerView } from '@/components/native/QRCodeScanner';
import { useAuth } from '@/providers/authProvider';
import {
  getAllDocumentsDirectlyFromKeychain,
  loadDocumentCatalogDirectlyFromKeychain,
} from '@/providers/passportDataProvider';

const MAX_WIRE_BYTES = 512 * 1024;
// A QR-declared relay is attacker-controllable input: only Self relays, wss only.
const RELAY_ALLOWED = [
  'wss://websocket.self.xyz',
  'wss://websocket.staging.self.xyz',
];
const ACK_TIMEOUT_MS = 60_000;

interface LinkQrContent {
  transferSessionId: string;
  /** Absent on older extension builds; the pre-send SAS display is skipped then. */
  helloSessionId?: string;
  receiverPublicKey: string;
  /** Out-of-band channel authenticator; absent on pre-v3 extension builds. */
  linkSecret: string;
  relay: string;
}

type Step = 'scan' | 'confirm' | 'sending' | 'success' | 'error';

function parseQrContent(raw: string): LinkQrContent {
  const parsed = JSON.parse(raw) as Partial<LinkQrContent>;
  if (
    typeof parsed.transferSessionId !== 'string' ||
    parsed.transferSessionId.length < 16
  ) {
    throw new Error('Missing transfer session id');
  }
  if (
    typeof parsed.receiverPublicKey !== 'string' ||
    !parsed.receiverPublicKey.startsWith('04')
  ) {
    throw new Error('Receiver key must be an uncompressed P-256 public key');
  }
  if (
    typeof parsed.relay !== 'string' ||
    !RELAY_ALLOWED.includes(parsed.relay)
  ) {
    throw new Error('Link code points at an unrecognized relay');
  }
  return parsed as LinkQrContent;
}

interface Channel {
  /** Raw ECDH x-coordinate; never used as an encryption key directly. */
  sharedSecret: Uint8Array;
  binding: TransferBinding;
  senderPublicKey: string;
}

function openChannelKeys(qr: LinkQrContent): Channel {
  const ephemeral = ec.genKeyPair();
  const receiver = ec.keyFromPublic(qr.receiverPublicKey, 'hex');
  const sharedSecret = new Uint8Array(
    ephemeral.derive(receiver.getPublic()).toArray('be', 32),
  );
  const senderPublicKey = ephemeral.getPublic(false, 'hex') as string;
  return {
    sharedSecret,
    senderPublicKey,
    binding: {
      sessionId: qr.transferSessionId,
      receiverPublicKey: qr.receiverPublicKey,
      senderPublicKey,
      linkSecret: qr.linkSecret,
    },
  };
}

function encryptWithChannel(channel: Channel, plaintext: string) {
  // HKDF-derived, transcript-bound key plus GCM additional data: substituting
  // a sender key or session id fails the tag on the extension side instead of
  // decrypting into a different account.
  const key = Buffer.from(
    deriveTransferKey(channel.sharedSecret, channel.binding),
  );
  const aad = Buffer.from(transferAad(channel.binding));
  const cipher = forge.cipher.createCipher(
    'AES-GCM',
    forge.util.createBuffer(key.toString('binary')),
  );
  const nonce = forge.random.getBytesSync(12);
  cipher.start({
    iv: nonce,
    additionalData: aad.toString('binary'),
    tagLength: 128,
  });
  cipher.update(forge.util.createBuffer(forge.util.encodeUtf8(plaintext)));
  cipher.finish();
  return {
    nonce: Buffer.from(nonce, 'binary').toString('base64'),
    cipherText: Buffer.from(cipher.output.getBytes(), 'binary').toString(
      'base64',
    ),
    authTag: Buffer.from(cipher.mode.tag.getBytes(), 'binary').toString(
      'base64',
    ),
  };
}

export const LinkBrowserExtensionScreen: React.FC = () => {
  const { getOrCreateMnemonic } = useAuth();
  const [step, setStep] = useState<Step>('scan');
  const [qrContent, setQrContent] = useState<LinkQrContent | null>(null);
  const [pasted, setPasted] = useState('');
  const [docCount, setDocCount] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [sas, setSas] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const helloSocketRef = useRef<Socket | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const messageRef = useRef<Record<string, unknown> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    helloSocketRef.current?.disconnect();
    helloSocketRef.current = null;
    channelRef.current = null;
    messageRef.current = null;
  }, []);

  const fail = useCallback(
    (message: string) => {
      cleanup();
      setSas([]);
      setStatusText(message);
      setStep('error');
    },
    [cleanup],
  );

  const acceptCode = useCallback(
    (raw: string) => {
      try {
        const parsed = parseQrContent(raw.trim());
        const channel = openChannelKeys(parsed);
        channelRef.current = channel;
        setSas(sasEmojis(channel.sharedSecret, channel.binding));
        setQrContent(parsed);

        const socket = io(`${parsed.relay}/websocket`, {
          path: '/',
          transports: ['websocket'],
          forceNew: true,
          query: { sessionId: parsed.transferSessionId, clientType: 'web' },
        });
        socketRef.current = socket;

        // Emit on connect, never wait for `mobile_connected`: the relayer's
        // presence status expires seconds after the extension joins, but room
        // forwarding and the proof_verified ack are not TTL'd (validated on
        // staging).
        socket.on('connect', () => {
          const pending = messageRef.current;
          if (pending) socket.emit('self_app', pending);
        });

        // The hello travels in its own room: the relayer forwards only the
        // first self_app per session, so it cannot share the transfer room.
        // It lets the extension display the SAS emojis before any secret moves.
        if (parsed.helloSessionId) {
          const helloSocket = io(`${parsed.relay}/websocket`, {
            path: '/',
            transports: ['websocket'],
            forceNew: true,
            query: { sessionId: parsed.helloSessionId, clientType: 'web' },
          });
          helloSocketRef.current = helloSocket;
          helloSocket.on('connect', () => {
            helloSocket.emit('self_app', {
              sessionId: parsed.helloSessionId,
              transferType: 'self-account-transfer-hello',
              senderPublicKey: channel.senderPublicKey,
            });
          });
        }
        socket.on(
          'mobile_status',
          (data: { status?: string; reason?: string }) => {
            switch (data?.status) {
              case 'proof_verified':
                if (!messageRef.current) return;
                cleanup();
                setStep('success');
                break;
              case 'proof_generation_failed':
                fail(
                  data?.reason
                    ? `Extension rejected the transfer: ${data.reason}`
                    : 'Extension rejected the transfer',
                );
                break;
              default:
                break;
            }
          },
        );
        socket.on('connect_error', (error: Error) => {
          fail(
            `Cannot reach the Self relay: ${error.message}. Check your connection and scan the code again.`,
          );
        });
        // The relayer rejects malformed joins with its own `error` event, and a
        // mid-send drop must surface rather than sit behind the spinner.
        socket.on('error', (payload: { message?: string } | string) => {
          const detail =
            typeof payload === 'string' ? payload : payload?.message;
          fail(
            `The Self relay rejected this session${detail ? `: ${detail}` : ''}. Scan the code again.`,
          );
        });
        socket.on('disconnect', (reason: string) => {
          if (reason === 'io client disconnect') return; // our own cleanup
          if (!messageRef.current) return; // nothing in flight yet
          setStatusText(
            `Connection dropped (${reason}). Retrying; the code may have expired.`,
          );
        });

        setStep('confirm');
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Invalid link code');
      }
    },
    [fail, cleanup],
  );

  const handleScan = useCallback(
    (error: Error | null, data?: string) => {
      if (step !== 'scan') return;
      if (error) {
        fail(error.message);
        return;
      }
      if (data) acceptCode(data);
    },
    [step, acceptCode, fail],
  );

  const send = useCallback(async () => {
    const channel = channelRef.current;
    const socket = socketRef.current;
    if (!qrContent || !channel || !socket) return;
    setStep('sending');
    setStatusText('Loading account from keychain…');

    try {
      const stored = await getOrCreateMnemonic();
      if (!stored) throw new Error('No account secret available');
      const catalog = await loadDocumentCatalogDirectlyFromKeychain();
      const allDocs = await getAllDocumentsDirectlyFromKeychain();
      setDocCount(catalog.documents.length);

      const payload = {
        version: 1,
        mnemonic: stored.data,
        documentCatalog: catalog,
        documents: Object.fromEntries(
          Object.entries(allDocs).map(([id, entry]) => [id, entry.data]),
        ),
      };

      setStatusText('Encrypting…');
      const message = {
        sessionId: qrContent.transferSessionId,
        transferType: 'self-account-transfer',
        senderPublicKey: channel.senderPublicKey,
        envelope: encryptWithChannel(channel, JSON.stringify(payload)),
      };
      const wireSize = JSON.stringify(message).length;
      if (wireSize > MAX_WIRE_BYTES) {
        throw new Error(
          `Payload too large for the relayer (${Math.round(wireSize / 1024)}KB > 512KB)`,
        );
      }

      messageRef.current = message;
      timeoutRef.current = setTimeout(
        () => fail('Timed out waiting for the extension'),
        ACK_TIMEOUT_MS,
      );
      if (socket.connected) {
        setStatusText(`Sending ${Math.round(wireSize / 1024)}KB…`);
        socket.emit('self_app', message);
      } else {
        setStatusText('Connecting to relayer…');
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Transfer failed');
    }
  }, [qrContent, getOrCreateMnemonic, fail]);

  return (
    <YStack flex={1} backgroundColor={white}>
      <ScrollView>
        <YStack padding={20} gap={16}>
          {step === 'scan' && (
            <>
              <Text style={styles.title}>Link browser extension</Text>
              <Text style={styles.body}>
                Open the Self extension in Chrome and scan the code it shows.
                Your secret and documents will be sent end-to-end encrypted.
                Only link a browser you own.
              </Text>
              <YStack
                height={280}
                borderRadius={12}
                overflow="hidden"
                backgroundColor={black}
              >
                <QRCodeScannerView
                  isMounted={step === 'scan'}
                  onQRData={handleScan}
                />
              </YStack>
              <Text style={styles.body}>
                Or paste the link code (emulator):
              </Text>
              <TextInput
                style={styles.input}
                value={pasted}
                onChangeText={setPasted}
                placeholder='{"transferSessionId":…}'
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
              <Button
                style={{ backgroundColor: black }}
                borderRadius="$10"
                disabled={pasted.trim().length === 0}
                onPress={() => acceptCode(pasted)}
              >
                <Text color={white} fontFamily={dinot}>
                  Use pasted code
                </Text>
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Text style={styles.title}>Send account to this browser?</Text>
              <Text style={styles.sas}>{sas.join('  ')}</Text>
              <Text style={styles.body}>
                Check that the extension window shows these same emojis.
                Matching emojis confirm the connection is end-to-end encrypted
                with that browser and nothing in between. If they differ,
                cancel.
              </Text>
              <Text style={styles.body}>
                This sends your recovery secret and every registered document to
                the extension over an end-to-end encrypted channel. Anyone
                controlling that browser can prove with your identity.
              </Text>
              <XStack gap={12}>
                <Button
                  flex={1}
                  borderColor={slate200}
                  onPress={() => {
                    cleanup();
                    setSas([]);
                    setStep('scan');
                  }}
                >
                  <Text fontFamily={dinot}>Cancel</Text>
                </Button>
                <Button
                  flex={1}
                  style={{ backgroundColor: black }}
                  borderRadius="$10"
                  onPress={() => void send()}
                >
                  <Text color={white} fontFamily={dinot}>
                    Send account
                  </Text>
                </Button>
              </XStack>
            </>
          )}

          {step === 'sending' && (
            <>
              <Text style={styles.title}>Sending…</Text>
              <Text style={styles.body}>{statusText}</Text>
              {sas.length > 0 && (
                <>
                  <Text style={styles.sas}>{sas.join('  ')}</Text>
                  <Text style={styles.body}>
                    Security check: the browser extension shows the same emojis.
                    If they differ, cancel and unlink.
                  </Text>
                </>
              )}
            </>
          )}

          {step === 'success' && (
            <>
              <Text style={styles.title}>Account linked</Text>
              <Text style={styles.body}>
                The extension confirmed the import
                {docCount > 0
                  ? ` (${docCount} document${docCount === 1 ? '' : 's'})`
                  : ''}
                . Finish the password setup in the browser.
              </Text>
              {sas.length > 0 && (
                <Text style={styles.sas}>{sas.join('  ')}</Text>
              )}
            </>
          )}

          {step === 'error' && (
            <>
              <Text style={styles.title}>Transfer failed</Text>
              <Text style={styles.body}>{statusText}</Text>
              <Button
                style={{ backgroundColor: black }}
                borderRadius="$10"
                onPress={() => setStep('scan')}
              >
                <Text color={white} fontFamily={dinot}>
                  Try again
                </Text>
              </Button>
            </>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
};

const styles = StyleSheet.create({
  title: {
    fontFamily: dinot,
    fontSize: 22,
    color: black,
  },
  body: {
    fontFamily: dinot,
    fontSize: 15,
    lineHeight: 21,
    color: slate500,
  },
  sas: {
    fontSize: 34,
    lineHeight: 44,
    textAlign: 'center',
    letterSpacing: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: slate200,
    borderRadius: 8,
    minHeight: 80,
    padding: 10,
    fontSize: 12,
    color: black,
  },
});

export default LinkBrowserExtensionScreen;
