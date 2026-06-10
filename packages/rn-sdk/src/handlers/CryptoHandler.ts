// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';

export interface SelfCryptoModule {
  generateKey(keyRef: string): Promise<{ keyRef: string }>;
  getPublicKey(keyRef: string): Promise<{ publicKey: string }>;
  sign(keyRef: string, dataBase64: string): Promise<{ signature: string }>;
}

function loadSelfCryptoModule(): SelfCryptoModule | undefined {
  try {
    const { NativeModules } = require('react-native') as {
      NativeModules: Record<string, unknown>;
    };
    const mod = NativeModules.SelfCrypto as SelfCryptoModule | undefined;
    if (
      mod &&
      typeof mod.generateKey === 'function' &&
      typeof mod.getPublicKey === 'function' &&
      typeof mod.sign === 'function'
    ) {
      return mod;
    }
  } catch {
    // require may throw when bundler is unaware of react-native at test time.
  }
  return undefined;
}

const KEY_REF_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

function assertKeyRef(value: unknown): string {
  if (typeof value !== 'string' || !KEY_REF_PATTERN.test(value)) {
    throw new BridgeHandlerError('INVALID_PARAMS', 'Invalid keyRef');
  }
  return value;
}

export class CryptoHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'crypto';
  private readonly crypto: SelfCryptoModule | undefined;

  constructor(crypto?: SelfCryptoModule) {
    this.crypto = crypto ?? loadSelfCryptoModule();
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.crypto) {
      throw new BridgeHandlerError(
        'NOT_AVAILABLE',
        'SelfCrypto native module is not installed',
      );
    }

    switch (method) {
      case 'generateKey': {
        const keyRef = assertKeyRef(params.keyRef);
        const result = await this.crypto.generateKey(keyRef);
        return { keyRef: result.keyRef, success: true };
      }
      case 'getPublicKey': {
        const keyRef = assertKeyRef(params.keyRef);
        const result = await this.crypto.getPublicKey(keyRef);
        if (typeof result?.publicKey !== 'string' || result.publicKey.length === 0) {
          throw new BridgeHandlerError(
            'KEY_NOT_FOUND',
            `No public key for keyRef ${keyRef}`,
          );
        }
        return { publicKey: result.publicKey };
      }
      case 'sign': {
        const keyRef = assertKeyRef(params.keyRef);
        const data = params.data;
        if (typeof data !== 'string' || data.length === 0) {
          throw new BridgeHandlerError('INVALID_PARAMS', 'data must be a non-empty base64 string');
        }
        const result = await this.crypto.sign(keyRef, data);
        if (typeof result?.signature !== 'string' || result.signature.length === 0) {
          throw new BridgeHandlerError('SIGN_FAILED', 'Signature returned was empty');
        }
        return { signature: result.signature };
      }
      default:
        throw new BridgeHandlerError(
          'METHOD_NOT_FOUND',
          `Unknown crypto method: ${method}`,
        );
    }
  }
}
