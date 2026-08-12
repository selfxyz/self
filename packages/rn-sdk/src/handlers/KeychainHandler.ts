// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';

export interface KeychainModule {
  getGenericPassword(opts: { service: string }): Promise<false | { username: string; password: string }>;
  setGenericPassword(username: string, password: string, opts: { service: string }): Promise<boolean>;
  resetGenericPassword(opts: { service: string }): Promise<boolean>;
}

export function loadKeychainModule(): KeychainModule | undefined {
  try {
    return require('react-native-keychain') as KeychainModule;
  } catch {
    return undefined;
  }
}

const SERVICE_PREFIX = 'self_sdk_';

export class KeychainHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'secureStorage';
  private readonly keychain: KeychainModule | undefined;

  constructor(keychain?: KeychainModule) {
    this.keychain = keychain ?? loadKeychainModule();
  }

  isAvailable(): boolean {
    return this.keychain !== undefined;
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.keychain) {
      throw new BridgeHandlerError('NOT_AVAILABLE', 'react-native-keychain is not installed');
    }

    switch (method) {
      case 'get': {
        const key = params.key as string | undefined;
        if (!key) throw new BridgeHandlerError('MISSING_KEY', 'Key parameter required');
        const credentials = await this.keychain.getGenericPassword({ service: `${SERVICE_PREFIX}${key}` });
        return credentials ? credentials.password : null;
      }
      case 'set': {
        const key = params.key as string | undefined;
        const value = params.value as string | undefined;
        if (!key) throw new BridgeHandlerError('MISSING_KEY', 'Key parameter required');
        if (value === undefined || value === null) {
          throw new BridgeHandlerError('MISSING_VALUE', 'Value parameter required');
        }
        await this.keychain.setGenericPassword(key, value, { service: `${SERVICE_PREFIX}${key}` });
        return null;
      }
      case 'remove': {
        const key = params.key as string | undefined;
        if (!key) throw new BridgeHandlerError('MISSING_KEY', 'Key parameter required');
        await this.keychain.resetGenericPassword({ service: `${SERVICE_PREFIX}${key}` });
        return null;
      }
      default:
        throw new BridgeHandlerError('METHOD_NOT_FOUND', `Unknown secureStorage method: ${method}`);
    }
  }
}
