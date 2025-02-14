import elliptic from 'elliptic';
import forge from 'node-forge';
import io, { Socket } from 'socket.io-client';
import { v4 } from 'uuid';

import {
  CIRCUIT_TYPES,
  WS_DB_RELAYER,
} from '../../../../common/src/constants/constants';
import { EndpointType } from '../../../../common/src/utils/appType';
import {
  ProofStatusEnum,
  updateGlobalProofStatus,
} from '../../stores/proofProvider';
import { getPublicKey, verifyAttestation } from './attest';

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
  circuit: (typeof CIRCUIT_TYPES)[number],
  circuitName: string,
  endpointType: EndpointType,
  endpoint: string,
  wsRpcUrl: string,
  timeoutMs = 1200000,
  options?: {
    updateGlobalOnSuccess?: boolean;
    updateGlobalOnFailure?: boolean;
  },
): Promise<ProofStatusEnum> {
  const opts = {
    updateGlobalOnSuccess: true,
    updateGlobalOnFailure: true,
    ...options,
  };
  return new Promise(resolve => {
    let finalized = false;
    function finalize(status: ProofStatusEnum) {
      if (!finalized) {
        finalized = true;
        clearTimeout(timer);
        if (
          (status === ProofStatusEnum.SUCCESS && opts.updateGlobalOnSuccess) ||
          (status !== ProofStatusEnum.SUCCESS && opts.updateGlobalOnFailure)
        ) {
          updateGlobalProofStatus(status);
        }
        resolve(status);
      }
    }
    console.log(inputs);
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
        if (result.result?.attestation !== undefined) {
          const serverPubkey = getPublicKey(result.result.attestation);
          const verified = await verifyAttestation(result.result.attestation);
          if (!verified) {
            finalize(ProofStatusEnum.FAILURE);
            throw new Error('Attestation verification failed');
          }
          const key2 = ec.keyFromPublic(serverPubkey as string, 'hex');
          const sharedKey = key1.derive(key2.getPublic());
          const forgeKey = forge.util.createBuffer(
            Buffer.from(
              sharedKey.toString('hex').padStart(64, '0'),
              'hex',
            ).toString('binary'),
          );
          const payload = getPayload(
            inputs,
            circuit,
            circuitName,
            endpointType,
            endpoint,
          );
          const encryptionData = encryptAES256GCM(
            JSON.stringify(payload),
            forgeKey,
          );
          const submitBody = {
            jsonrpc: '2.0',
            method: 'openpassport_submit_request',
            id: 1,
            params: {
              uuid: result.result.uuid,
              ...encryptionData,
            },
          };
          console.log('Sending submit body');
          const truncatedBody = {
            ...submitBody,
            params: {
              uuid: submitBody.params.uuid,
              nonce: submitBody.params.nonce.slice(0, 3) + '...',
              cipher_text: submitBody.params.cipher_text.slice(0, 3) + '...',
              auth_tag: submitBody.params.auth_tag.slice(0, 3) + '...',
            },
          };
          console.log('Truncated submit body:', truncatedBody);
          ws.send(JSON.stringify(submitBody));
        } else {
          const receivedUuid = result.result;
          console.log('Received UUID:', receivedUuid);
          console.log(result);
          if (!socket) {
            socket = io(WS_DB_RELAYER, {
              path: '/',
              transports: ['websocket'],
            });
            socket.on('connect', () => {
              console.log('SocketIO: Connection opened');
              socket?.emit('subscribe', receivedUuid);
            });
            socket.on('status', message => {
              const data =
                typeof message === 'string' ? JSON.parse(message) : message;
              console.log('SocketIO message:', data);
              if (data.status === 2) {
                console.log('Proof generation completed');
                socket?.disconnect();
                if (ws.readyState === WebSocket.OPEN) {
                  ws.close();
                }
                finalize(ProofStatusEnum.SUCCESS);
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
      if (!finalized) {
        finalize(ProofStatusEnum.FAILURE);
      }
    });
    const timer = setTimeout(() => {
      if (socket) {
        socket.disconnect();
      }
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
      finalize(ProofStatusEnum.ERROR);
    }, timeoutMs);
  });
}

export { encryptAES256GCM };

/***
 *  types
 * ***/
export type TEEPayloadDisclose = {
  type: 'disclose';
  endpointType: string;
  endpoint: string;
  onchain: boolean;
  circuit: {
    name: string;
    inputs: string;
  };
};

export type TEEPayload = {
  type: 'register' | 'dsc';
  onchain: true;
  circuit: {
    name: string;
    inputs: string;
  };
};
export function getPayload(
  inputs: any,
  circuit: string,
  circuitName: string,
  endpointType: string,
  endpoint: string,
) {
  if (circuit === 'vc_and_disclose') {
    const payload: TEEPayloadDisclose = {
      type: 'disclose',
      endpointType: endpointType,
      endpoint: endpoint,
      onchain: endpointType === 'celo' ? true : false,
      circuit: {
        name: circuitName,
        inputs: JSON.stringify(inputs),
      },
    };
    return payload;
  } else if (circuit === 'register' || circuit === 'dsc') {
    const payload: TEEPayload = {
      type: circuit as 'register' | 'dsc',
      onchain: true,
      circuit: {
        name: circuitName,
        inputs: JSON.stringify(inputs),
      },
    };
    return payload;
  }
}
