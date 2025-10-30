import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { WebSocket } from 'ws';
import {
  generateX25519Keypair,
  kyberEncapsulate,
  computeX25519SharedSecret,
  deriveSessionKey,
  getSupportedSuites,
} from '../src/utils/proving/pqxdh-crypto.js';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { p256 } from '@noble/curves/nist.js';

/// Tests end-to-end PQXDH handshake between TypeScript client and Rust TEE server.
/// This test spawns a local Rust server and performs a full handshake programmatically.
describe('Cross-Language PQXDH Integration', () => {
  let serverProcess: ChildProcess | null = null;
  let serverReady = false;
  const SERVER_URL = 'ws://127.0.0.1:9944';
  const START_TIMEOUT = 30000; // 30 seconds for server to start

  /// Starts the Rust test server before running tests.
  beforeAll(async () => {
    console.log('🚀 Starting Rust PQXDH test server...');

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server failed to start within timeout'));
        }
      }, START_TIMEOUT);

      // spawning the Rust test server
      serverProcess = spawn(
        'cargo',
        ['run', '--example', 'pqxdh_test_server', '--features', 'test_mode'],
        {
          cwd: '../TEE-prover-server',
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      serverProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`[Server] ${output.trim()}`);

        // waiting for "Server ready" message
        if (output.includes('Server ready')) {
          serverReady = true;
          clearTimeout(timeout);
          console.log('✅ Rust server is ready');
          // giving server a moment to fully initialize
          setTimeout(resolve, 1000);
        }
      });

      serverProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`[Server Error] ${data.toString().trim()}`);
      });

      serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      serverProcess.on('exit', (code) => {
        if (!serverReady) {
          clearTimeout(timeout);
          reject(new Error(`Server exited prematurely with code ${code}`));
        }
      });
    });
  }, START_TIMEOUT + 5000);

  /// Stops the Rust test server after all tests complete.
  afterAll(async () => {
    if (serverProcess) {
      console.log('🛑 Stopping Rust server...');
      serverProcess.kill('SIGTERM');

      // waiting for shutdown
      await new Promise<void>((resolve) => {
        serverProcess!.on('exit', () => {
          console.log('✅ Server stopped');
          resolve();
        });

        // force killing after timeout
        setTimeout(() => {
          if (serverProcess && !serverProcess.killed) {
            console.log('⚠️  Force killing server');
            serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    }
  });

  /// Sends a JSON-RPC request over WebSocket and waits for the matching response.
  /// Returns a promise that resolves with the result or rejects on error/timeout.
  function sendRpcRequest(
    ws: WebSocket,
    method: string,
    params: any,
    id: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // setting up timeout for request
      const timeout = setTimeout(() => {
        reject(new Error(`RPC request timeout: ${method}`));
      }, 10000);

      // handler for incoming messages
      const messageHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === id) {
            clearTimeout(timeout);
            ws.off('message', messageHandler);

            if (response.error) {
              reject(new Error(`RPC error: ${JSON.stringify(response.error)}`));
            } else {
              resolve(response.result);
            }
          }
        } catch (err) {
          console.error('Failed to parse response:', err);
        }
      };

      ws.on('message', messageHandler);

      // sending JSON-RPC request
      const request = {
        jsonrpc: '2.0',
        method,
        params,
        id,
      };

      ws.send(JSON.stringify(request));
    });
  }

  /// Tests complete PQXDH handshake with 6-step protocol:
  // hello -> key_exchange -> verification.
  /// Verifies that client and server derive identical session keys through X25519 + Kyber.
  it('should complete full PQXDH handshake with Rust server', async () => {
    // generating client X25519 keypair
    const clientX25519Keys = generateX25519Keypair();
    const uuid = crypto.randomUUID();

    console.log('\n🔐 Starting PQXDH handshake...');
    console.log(`   UUID: ${uuid}`);

    // establishing WebSocket connection
    const ws = new WebSocket(SERVER_URL);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });
      ws.on('error', reject);
    });

    try {
      // sending hello with client's X25519 public key
      console.log('\n📤 Step 1: Sending hello...');
      const helloResponse = await sendRpcRequest(
        ws,
        'openpassport_hello',
        {
          user_pubkey: Array.from(clientX25519Keys.publicKey),
          uuid,
          supported_suites: getSupportedSuites(),
        },
        1
      );

      console.log(`   Selected suite: ${helloResponse.selected_suite}`);
      expect(helloResponse.selected_suite).toBe('Self-PQXDH-1');
      expect(helloResponse.x25519_pubkey).toBeDefined();
      expect(helloResponse.kyber_pubkey).toBeDefined();
      expect(helloResponse.attestation).toBeDefined();

      // verifying key sizes
      expect(helloResponse.x25519_pubkey.length).toBe(32);
      expect(helloResponse.kyber_pubkey.length).toBe(1184); // ML-KEM-768 public key

      console.log('✅ Received server public keys');

      // computing X25519 shared secret
      console.log('\n🔑 Step 2: Computing X25519 shared secret...');
      const serverX25519Public = new Uint8Array(helloResponse.x25519_pubkey);
      const clientX25519Shared = computeX25519SharedSecret(
        clientX25519Keys.privateKey,
        serverX25519Public
      );

      console.log(`   X25519 shared secret (first 8 bytes): ${Buffer.from(clientX25519Shared.slice(0, 8)).toString('hex')}`);

      // encapsulating to server's Kyber public key
      console.log('\n📦 Step 3: Kyber encapsulation...');
      const serverKyberPublic = new Uint8Array(helloResponse.kyber_pubkey);
      console.log(`   Server Kyber public key length: ${serverKyberPublic.length} bytes`);
      console.log(`   Server Kyber public key (first 16 bytes): ${Buffer.from(serverKyberPublic.slice(0, 16)).toString('hex')}`);

      const { sharedSecret: clientKyberShared, ciphertext } = kyberEncapsulate(serverKyberPublic);

      expect(ciphertext.length).toBe(1088); // ML-KEM-768 ciphertext
      expect(clientKyberShared.length).toBe(32);

      console.log(`   Kyber ciphertext: ${ciphertext.length} bytes`);
      console.log(`   Kyber ciphertext (first 16 bytes): ${Buffer.from(ciphertext.slice(0, 16)).toString('hex')}`);
      console.log(`   Kyber shared secret (first 8 bytes): ${Buffer.from(clientKyberShared.slice(0, 8)).toString('hex')}`);

      // sending key_exchange with Kyber ciphertext
      console.log('\n📤 Step 4: Sending key_exchange...');
      const keyExchangeResponse = await sendRpcRequest(
        ws,
        'openpassport_key_exchange',
        {
          uuid,
          kyber_ciphertext: Array.from(ciphertext),
        },
        2
      );

      expect(keyExchangeResponse).toBe('key_exchange_complete');
      console.log('✅ Server completed key exchange');

      // deriving client-side session key
      console.log('\n🔐 Step 5: Deriving session key...');
      const clientSessionKey = deriveSessionKey(clientX25519Shared, clientKyberShared);

      console.log(`   Client session key (first 8 bytes): ${clientSessionKey.subarray(0, 8).toString('hex')}`);

      // getting server's session key for verification (DEBUG ONLY)
      console.log('\n🔍 Step 6: Verifying keys match (DEBUG)...');
      const serverSessionKey = await sendRpcRequest(
        ws,
        'openpassport_debug_get_session_key',
        { uuid },
        10
      );

      const serverKeyBuffer = Buffer.from(serverSessionKey);
      console.log(`   Server session key (first 8 bytes): ${serverKeyBuffer.subarray(0, 8).toString('hex')}`);

      // verifying session keys match
      expect(serverKeyBuffer.length).toBe(32);
      expect(clientSessionKey).toEqual(serverKeyBuffer);

      console.log('\n✅ SUCCESS! Session keys match perfectly!');
      console.log('   Both client and server derived identical keys');
      console.log('   PQXDH handshake is working correctly!');
    } finally {
      ws.close();
    }
  }, 30000);

  /// Tests that server supports legacy P-256 ECDH fallback when client doesn't support PQXDH.
  /// Verifies that server correctly negotiates suite and omits PQXDH fields from response.
  it('should support legacy P-256 fallback', async () => {
    // generating valid P-256 keypair using @noble/curves
    const p256PrivateKey = p256.utils.randomSecretKey();
    const p256PublicKey = p256.getPublicKey(p256PrivateKey, true); // compressed format

    const uuid = crypto.randomUUID();

    const ws = new WebSocket(SERVER_URL);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    try {
      console.log('\n🔄 Testing legacy P-256 fallback...');
      const helloResponse = await sendRpcRequest(
        ws,
        'openpassport_hello',
        {
          user_pubkey: Array.from(p256PublicKey),
          uuid,
          supported_suites: ['legacy-p256'], // only legacy
        },
        3
      );

      console.log(`   Selected suite: ${helloResponse.selected_suite}`);
      expect(helloResponse.selected_suite).toBe('legacy-p256');
      expect(helloResponse.x25519_pubkey).toBeUndefined();
      expect(helloResponse.kyber_pubkey).toBeUndefined();
      expect(helloResponse.attestation).toBeDefined();

      console.log('✅ Legacy P-256 fallback works');
    } finally {
      ws.close();
    }
  }, 15000);

  /// Tests that server rejects handshakes when no supported cipher suites are found.
  /// Verifies proper error handling during suite negotiation phase.
  it('should reject unsupported cipher suites', async () => {
    const clientKeys = generateX25519Keypair();
    const uuid = crypto.randomUUID();

    const ws = new WebSocket(SERVER_URL);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    try {
      console.log('\n❌ Testing rejection of unsupported suites...');

      // attempting handshake with unsupported suite
      await expect(
        sendRpcRequest(
          ws,
          'openpassport_hello',
          {
            user_pubkey: Array.from(clientKeys.publicKey),
            uuid,
            supported_suites: ['unsupported-suite'],
          },
          4
        )
      ).rejects.toThrow();

      console.log('✅ Server correctly rejects unsupported suites');
    } finally {
      ws.close();
    }
  }, 15000);

  /// Tests that server enforces correct public key sizes during handshake.
  /// X25519 keys must be exactly 32 bytes, otherwise server should reject with error.
  it('should reject invalid public key sizes', async () => {
    const uuid = crypto.randomUUID();
    const ws = new WebSocket(SERVER_URL);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    try {
      console.log('\n❌ Testing rejection of invalid key size...');

      // sending wrong size for X25519 (should be 32 bytes)
      await expect(
        sendRpcRequest(
          ws,
          'openpassport_hello',
          {
            user_pubkey: Array.from(new Uint8Array(16)), // wrong size
            uuid,
            supported_suites: ['Self-PQXDH-1'],
          },
          5
        )
      ).rejects.toThrow();

      console.log('✅ Server correctly rejects invalid key sizes');
    } finally {
      ws.close();
    }
  }, 15000);

  /// Tests that server validates Kyber ciphertext length during key_exchange.
  /// ML-KEM-768 ciphertexts must be exactly 1088 bytes, otherwise server should reject.
  it('should reject invalid Kyber ciphertext', async () => {
    const clientKeys = generateX25519Keypair();
    const uuid = crypto.randomUUID();

    const ws = new WebSocket(SERVER_URL);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    try {
      // completing hello to establish pending state
      await sendRpcRequest(
        ws,
        'openpassport_hello',
        {
          user_pubkey: Array.from(clientKeys.publicKey),
          uuid,
          supported_suites: ['Self-PQXDH-1'],
        },
        6
      );

      console.log('\n❌ Testing rejection of invalid Kyber ciphertext...');

      // sending wrong ciphertext size
      await expect(
        sendRpcRequest(
          ws,
          'openpassport_key_exchange',
          {
            uuid,
            kyber_ciphertext: Array.from(new Uint8Array(500)), // wrong size
          },
          7
        )
      ).rejects.toThrow();

      console.log('✅ Server correctly rejects invalid ciphertext size');
    } finally {
      ws.close();
    }
  }, 15000);
});
