// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import forge from 'node-forge';
import { describe, expect, it } from 'vitest';

import { encryptAES256GCM, getPayload, getWSDbRelayerUrl } from '../src/utils/proving.js';

describe('encryptAES256GCM', () => {
  it('encrypts and decrypts correctly', () => {
    const key = forge.random.getBytesSync(32);
    const plaintext = 'hello world';
    const encrypted = encryptAES256GCM(plaintext, forge.util.createBuffer(key));

    // Convert arrays to Uint8Array first to ensure proper byte conversion
    const nonceBytes = new Uint8Array(encrypted.nonce);
    const authTagBytes = new Uint8Array(encrypted.auth_tag);
    const cipherTextBytes = new Uint8Array(encrypted.cipher_text);

    // Validate tag length (128 bits = 16 bytes)
    expect(authTagBytes.length).toBe(16);

    const decipher = forge.cipher.createDecipher('AES-GCM', forge.util.createBuffer(key));
    decipher.start({
      iv: forge.util.createBuffer(Buffer.from(nonceBytes).toString('binary')),
      tagLength: 128,
      tag: forge.util.createBuffer(Buffer.from(authTagBytes).toString('binary')),
    });
    decipher.update(forge.util.createBuffer(Buffer.from(cipherTextBytes).toString('binary')));
    const success = decipher.finish();
    const decrypted = decipher.output.toString();

    expect(success).toBe(true);
    expect(decrypted).toBe(plaintext);
  });

  it('produces unique nonces for each encryption', () => {
    const key = forge.random.getBytesSync(32);
    const plaintext = 'hello world';

    const encrypted1 = encryptAES256GCM(plaintext, forge.util.createBuffer(key));
    const encrypted2 = encryptAES256GCM(plaintext, forge.util.createBuffer(key));

    // Nonces should be different for each encryption
    expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
    // Ciphertexts should also be different due to different IVs
    expect(encrypted1.cipher_text).not.toEqual(encrypted2.cipher_text);
  });
});

describe('getPayload', () => {
  it('returns disclose payload', () => {
    const inputs = { foo: 'bar' };
    const payload = getPayload(
      inputs,
      'disclose',
      'vc_and_disclose',
      'https',
      'https://example.com',
      2,
      '0xabc'
    );

    expect(payload).toEqual({
      type: 'disclose',
      endpointType: 'https',
      endpoint: 'https://example.com',
      onchain: false,
      circuit: { name: 'vc_and_disclose', inputs: JSON.stringify(inputs) },
      version: 2,
      userDefinedData: '0xabc',
      selfDefinedData: '',
    });
  });

  it('returns register payload', () => {
    const payload = getPayload(
      { a: 1 },
      'register',
      'register_circuit',
      'celo',
      'https://self.xyz'
    );

    expect(payload).toEqual({
      type: 'register',
      onchain: true,
      endpointType: 'celo',
      circuit: { name: 'register_circuit', inputs: JSON.stringify({ a: 1 }) },
    });
  });

  it('returns disclose_aadhaar payload for vc_and_disclose_aadhaar circuit', () => {
    const inputs = { test: 'data' };
    const payload = getPayload(
      inputs,
      'disclose',
      'vc_and_disclose_aadhaar',
      'https',
      'https://example.com'
    );

    expect(payload).toEqual({
      type: 'disclose_aadhaar',
      endpointType: 'https',
      endpoint: 'https://example.com',
      onchain: false,
      circuit: { name: 'vc_and_disclose_aadhaar', inputs: JSON.stringify(inputs) },
      version: 1,
      userDefinedData: '',
      selfDefinedData: '',
    });
  });

  it('returns register_aadhaar payload for register_aadhaar circuit', () => {
    const payload = getPayload(
      { a: 1 },
      'register',
      'register_aadhaar',
      'celo',
      'https://self.xyz'
    );

    expect(payload).toEqual({
      type: 'register_aadhaar',
      onchain: true,
      endpointType: 'celo',
      circuit: { name: 'register_aadhaar', inputs: JSON.stringify({ a: 1 }) },
    });
  });
});

describe('getWSDbRelayerUrl', () => {
  it('returns production URL for celo endpoint', () => {
    expect(getWSDbRelayerUrl('celo')).toContain('websocket.self.xyz');
  });

  it('returns production URL for https endpoint', () => {
    expect(getWSDbRelayerUrl('https')).toContain('websocket.self.xyz');
  });

  it('returns staging URL for staging_celo endpoint', () => {
    expect(getWSDbRelayerUrl('staging_celo')).toContain('websocket.staging.self.xyz');
  });
});
