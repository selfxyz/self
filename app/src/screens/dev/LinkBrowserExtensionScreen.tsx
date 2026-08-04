// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Buffer } from 'buffer';
import forge from 'node-forge';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { io, type Socket } from 'socket.io-client';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { ec } from '@selfxyz/common/utils/proving';
import {
  Description,
  PrimaryButton,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate200,
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
import type { RootStackParamList } from '@/navigation';
import { useAuth } from '@/providers/authProvider';
import {
  getAllDocumentsDirectlyFromKeychain,
  loadDocumentCatalogDirectlyFromKeychain,
} from '@/providers/passportDataProvider';

const MAX_WIRE_BYTES = 512 * 1024;
const RELAY_ALLOWED = [
  'wss://websocket.self.xyz',
  'wss://websocket.staging.self.xyz',
];
const ACK_TIMEOUT_MS = 60_000;

interface LinkQrContent {
  transferSessionId: string;
  helloSessionId?: string;
  receiverPublicKey: string;
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

// Styling QA fixture (dev shortcut): stages the confirm step with no live
// channel behind it. Must match SAS_LENGTH (6) so layout QA sees the real
// row width.
const DEMO_SAS = ['🦊', '🌈', '🚀', '🍀', '⛵', '🏀'];

export const LinkBrowserExtensionScreen: React.FC = () => {
  const { getOrCreateMnemonic } = useAuth();
  const route =
    useRoute<RouteProp<RootStackParamList, 'LinkBrowserExtension'>>();
  const demo = route.params?.demo === true;
  const { bottom } = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(demo ? 'confirm' : 'scan');
  const [qrContent, setQrContent] = useState<LinkQrContent | null>(null);
  const [pasted, setPasted] = useState('');
  const [docCount, setDocCount] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [sas, setSas] = useState<string[]>(demo ? DEMO_SAS : []);
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

  useEffect(() => cleanup, [cleanup]);

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

        socket.on('connect', () => {
          const pending = messageRef.current;
          if (pending) socket.emit('self_app', pending);
        });

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
    if (demo) {
      setDocCount(2);
      setStep('success');
      return;
    }
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

      const registered = catalog.documents.filter(
        doc => (doc as { isRegistered?: boolean }).isRegistered,
      );
      if (registered.length === 0) {
        throw new Error(
          'No registered document to send yet. Finish registering a document in Self, then link this browser.',
        );
      }

      const payload = {
        version: 1,
        linkedAt: new Date().toISOString(),
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
  }, [demo, qrContent, getOrCreateMnemonic, fail]);

  const cancelToScan = useCallback(() => {
    cleanup();
    setSas(demo ? DEMO_SAS : []);
    setStep(demo ? 'confirm' : 'scan');
  }, [cleanup, demo]);

  const sasRow = (
    <XStack justifyContent="center" gap={20} flexWrap="nowrap">
      {sas.map((emoji, index) => (
        <Text key={index} style={styles.sasEmoji} numberOfLines={1}>
          {emoji}
        </Text>
      ))}
    </XStack>
  );

  return (
    <YStack
      flex={1}
      backgroundColor={white}
      paddingBottom={Math.max(bottom, 16)}
    >
      <ScrollView flex={1}>
        <YStack padding={20} gap={16}>
          {step === 'scan' && (
            <>
              <Title>Link browser extension</Title>
              <Description>
                Scan the code shown by the Self extension.
              </Description>
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
              <Description>Or paste the link code (emulator):</Description>
              <TextInput
                style={styles.input}
                value={pasted}
                onChangeText={setPasted}
                placeholder='{"transferSessionId":…}'
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
            </>
          )}

          {step === 'confirm' && (
            <>
              <Title>Send account to this browser?</Title>
              {sasRow}
              <Description>
                Send only if your browser shows these exact emojis. That browser
                will be able to prove with your identity.
              </Description>
            </>
          )}

          {step === 'sending' && (
            <>
              <Title>Sending…</Title>
              {sasRow}
              <Description>{statusText}</Description>
            </>
          )}

          {step === 'success' && (
            <>
              <Title>Account linked</Title>
              {sasRow}
              <Description>
                {docCount > 0
                  ? `${docCount} document${docCount === 1 ? '' : 's'} sent. `
                  : ''}
                Finish setup in the browser.
              </Description>
            </>
          )}

          {step === 'error' && (
            <>
              <Title>Transfer failed</Title>
              <Description>{statusText}</Description>
            </>
          )}
        </YStack>
      </ScrollView>

      {step === 'scan' && (
        <YStack paddingHorizontal={20} paddingTop={12}>
          <PrimaryButton
            disabled={pasted.trim().length === 0}
            onPress={() => acceptCode(pasted)}
          >
            Use pasted code
          </PrimaryButton>
        </YStack>
      )}
      {step === 'confirm' && (
        <XStack gap={12} paddingHorizontal={20} paddingTop={12}>
          <YStack flex={1}>
            <SecondaryButton onPress={cancelToScan}>Cancel</SecondaryButton>
          </YStack>
          <YStack flex={1}>
            <PrimaryButton onPress={() => void send()}>
              Send account
            </PrimaryButton>
          </YStack>
        </XStack>
      )}
      {step === 'error' && (
        <YStack paddingHorizontal={20} paddingTop={12}>
          <PrimaryButton onPress={cancelToScan}>Try again</PrimaryButton>
        </YStack>
      )}
    </YStack>
  );
};

const styles = StyleSheet.create({
  sasEmoji: {
    fontSize: 34,
    lineHeight: 44,
  },
  input: {
    borderWidth: 1,
    borderColor: slate200,
    borderRadius: 8,
    minHeight: 80,
    padding: 10,
    fontSize: 12,
    color: black,
    fontFamily: dinot,
  },
});

export default LinkBrowserExtensionScreen;
