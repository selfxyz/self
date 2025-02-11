import elliptic from 'elliptic';
import forge from 'node-forge';
import { v4 } from 'uuid';
import io, { Socket } from 'socket.io-client';
import { WS_RPC_URL, WS_URL } from '../../../../common/src/constants/constants';
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
  circuitName: string,
  timeoutMs = 1200000,
) {
  const uuid = v4();
  const ws = new WebSocket(WS_RPC_URL);
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
    console.log('Connected to rpc');
    console.log('Sending hello body:', helloBody);
    ws.send(JSON.stringify(helloBody));
  });

  ws.addEventListener('message', async event => {
    try {
      const result = JSON.parse(event.data);
      if (result.result?.attestation !== undefined) {
        await processAttestation(result);
      } else {
        processUuid(result);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      console.error('Raw message data:', event.data);
    }
  });

  ws.addEventListener('error', error => {
    console.error('WebSocket 1 error:', error);
  });

  ws.addEventListener('close', event => {
    console.log(
      `WebSocket 1 closed. Code: ${event.code}, Reason: ${event.reason}`,
    );
  });

  function setupSocketIO(uuidVal: string) {
    socket = io(WS_URL, {
      path: '/',
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('SocketIO: Connection opened');
      socket?.emit('subscribe', uuidVal);
    });

    socket.on('connect_error', (error) => {
      console.error('SocketIO connection error:', error);
    });

    socket.on('message', (message) => {
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      console.log('SocketIO message:', data);

      if (data.new_status === 2) {
        console.log('Proof generation completed');
        socket?.disconnect();
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`SocketIO disconnected. Reason: ${reason}`);
    });
  }

  function processUuid(result: any) {
    const receivedUuid = result.result;
    console.log('Received UUID:', receivedUuid);
    setupSocketIO(receivedUuid);
  }

  async function processAttestation(result: any) {
    const serverPubkey = getPublicKey(result.result.attestation);
    const verified = await verifyAttestation(result.result.attestation);
    console.log('AWS Root Certificate verified:', verified);
    const key2 = ec.keyFromPublic(serverPubkey as string, 'hex');
    const sharedKey = key1.derive(key2.getPublic());
    const forgeKey = forge.util.createBuffer(
      Buffer.from(sharedKey.toString('hex').padStart(64, '0'), 'hex').toString(
        'binary',
      ),
    );
    const encryptionData = encryptAES256GCM(
      JSON.stringify({
        type: 'register',
        circuit: {
          name: 'register_sha1_sha256_sha256_rsa_65537_4096',
          inputs: JSON.stringify(inputs),
          public_inputs: JSON.stringify({}),
        },
      }),
      forgeKey,
    );
    const submitBody = {
      jsonrpc: '2.0',
      method: 'openpassport_submit_request',
      id: 1,
      params: {
        uuid: result.result.uuid,
        ...encryptionData,
        onchain: true,
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
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (socket) {
        socket.disconnect();
      }
      ws.close();
      reject(new Error(`Request timed out after ${timeoutMs} ms`));
    }, timeoutMs);

    ws.addEventListener('close', () => {
      clearTimeout(timer);
      if (socket) {
        socket.disconnect();
      }
      resolve(undefined);
    });

    ws.addEventListener('error', error => {
      clearTimeout(timer);
      if (socket) {
        socket.disconnect();
      }
      reject(error);
    });
  });
}

export { encryptAES256GCM };
