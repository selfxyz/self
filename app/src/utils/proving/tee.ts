import elliptic from 'elliptic';
import forge from 'node-forge';
import io, { Socket } from 'socket.io-client';
import { v4 } from 'uuid';

import { WS_DB_RELAYER_OLD } from '../../../../common/src/constants/constants';
import { getPublicKey, verifyAttestation } from './attest';
import { updateGlobalProofStatus, ProofStatusEnum } from '../../stores/proofProvider';

const { ec: EC } = elliptic;

/**
 * @notice Encrypts plaintext using AES-256-GCM encryption.
 * @param plaintext The string to be encrypted.
 * @param key The encryption key as a forge ByteStringBuffer.
 * @return An object containing the nonce, cipher_text, and auth_tag as arrays of numbers.
 */
function encryptAES256GCM(plaintext: string, key: forge.util.ByteStringBuffer) {
  const iv = forge.random.getBytesSync(12);
  const cipher = forge.cipher.createCipher('AES-GCM', key);
  cipher.start({ iv: iv, tagLength: 128 });
  cipher.update(forge.util.createBuffer(plaintext, 'utf8'));
  cipher.finish();
  const encrypted = cipher.output.getBytes();
  const authTag = cipher.mode.tag.getBytes();
  return {
    nonce: Array.from(Buffer.from(iv, 'binary')),
    cipher_text: Array.from(Buffer.from(encrypted, 'binary')),
    auth_tag: Array.from(Buffer.from(authTag, 'binary')),
  };
}

const ec = new EC('p256');
const key1 = ec.genKeyPair();
const pubkey =
  key1.getPublic().getX().toString('hex').padStart(64, '0') +
  key1.getPublic().getY().toString('hex').padStart(64, '0');

/**
 * @notice Sends a payload over WebSocket connecting to the TEE server, processes the attestation,
 *         and submits a registration request encrypted via a shared key derived using ECDH.
 * @param inputs The circuit input parameters.
 * @param circuitName The name of the circuit.
 * @param timeoutMs The timeout in milliseconds (default is 1200000 ms).
 * @return A promise that resolves when the request completes or rejects on error/timeout.
 * @dev This function sets up two WebSocket connections: one for RPC and one for subscription updates.
 */
export async function sendPayload(
  inputs: any,
  circuitName: string,
  wsRpcUrl: string,
  timeoutMs = 1200000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let finalized = false;
    function finalize(status: ProofStatusEnum) {
      if (!finalized) {
        finalized = true;
        updateGlobalProofStatus(status);
        clearTimeout(timer);
        resolve();
      }
    }

    const uuid = v4();
    const ws = new WebSocket(wsRpcUrl);
    let socket: Socket | null = null;

    function createHelloBody(uuidString: string) {
      return {
        jsonrpc: '2.0',
        method: 'openpassport_hello',
        id: 1,
        params: {
          user_pubkey: [4, ...Array.from(Buffer.from(pubkey, 'hex'))],
          uuid: uuidString,
        },
      };
    }

    ws.addEventListener('open', () => {
      const helloBody = createHelloBody(uuid);
      console.log('Connected to rpc, sending hello body:', helloBody);
      ws.send(JSON.stringify(helloBody));
    });

    ws.addEventListener('message', async event => {
      try {
        const result = JSON.parse(event.data);
        // If attestation is present, process it.
        if (result.result?.attestation !== undefined) {
          const serverPubkey = getPublicKey(result.result.attestation);
          const verified = await verifyAttestation(result.result.attestation);
          console.log('AWS Root Certificate verified:', verified);
          if (verified) {
            finalize(ProofStatusEnum.SUCCESS);
          } else {
            finalize(ProofStatusEnum.FAILURE);
          }
        } else {
          // Otherwise, assume it's a UUID. Set up SocketIO to get further progress.
          const receivedUuid = result.result;
          console.log('Received UUID:', receivedUuid);
          if (!socket) {
            socket = io(WS_DB_RELAYER_OLD, {
              path: '/',
              transports: ['websocket'],
            });
            socket.on('connect', () => {
              console.log('SocketIO: Connection opened');
              socket?.emit('subscribe', receivedUuid);
            });
            socket.on('message', message => {
              const data =
                typeof message === 'string' ? JSON.parse(message) : message;
              console.log('SocketIO message:', data);
              // When the proof has generated, disconnect and close the WebSocket.
              if (data.new_status === 2) {
                console.log('Proof generation completed');
                socket?.disconnect();
                if (ws.readyState === WebSocket.OPEN) {
                  ws.close();
                }
              }
            });
            socket.on('disconnect', reason => {
              console.log(`SocketIO disconnected. Reason: ${reason}`);
            });
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
        finalize(ProofStatusEnum.ERROR);
      }
    });

    ws.addEventListener('error', error => {
      console.error('WebSocket error:', error);
      finalize(ProofStatusEnum.ERROR);
    });

    ws.addEventListener('close', event => {
      console.log(
        `WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`,
      );
      // If finalization hasn't occurred, assume the connection closed unexpectedly.
      if (!finalized) {
        finalize(ProofStatusEnum.FAILURE);
      }
    });

    const timer = setTimeout(() => {
      if (socket) {
        socket.disconnect();
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      finalize(ProofStatusEnum.ERROR);
    }, timeoutMs);
  });
}

export { encryptAES256GCM };
