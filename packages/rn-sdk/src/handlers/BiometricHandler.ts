// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';

export interface BiometricsModule {
  isSensorAvailable(): Promise<{ available: boolean; biometryType?: string }>;
  simplePrompt(opts: { promptMessage: string }): Promise<{ success: boolean }>;
}

export interface BiometricsModuleConstructor {
  new (): BiometricsModule;
}

function loadBiometrics(): BiometricsModuleConstructor | undefined {
  try {
    return require('react-native-biometrics').default;
  } catch {
    return undefined;
  }
}

export class BiometricHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'biometrics';
  private readonly BiometricsClass: BiometricsModuleConstructor | undefined;

  constructor(biometricsClass?: BiometricsModuleConstructor) {
    this.BiometricsClass = biometricsClass ?? loadBiometrics();
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.BiometricsClass) {
      throw new BridgeHandlerError('NOT_AVAILABLE', 'react-native-biometrics is not installed');
    }

    const biometrics = new this.BiometricsClass();

    switch (method) {
      case 'isAvailable': {
        const result = await biometrics.isSensorAvailable();
        return result.available;
      }
      case 'getBiometryType': {
        const result = await biometrics.isSensorAvailable();
        return result.biometryType ?? 'none';
      }
      case 'authenticate': {
        const reason = (params.reason as string) ?? 'Verify your identity';
        const result = await biometrics.simplePrompt({ promptMessage: reason });
        if (!result.success) {
          throw new BridgeHandlerError('BIOMETRIC_FAILED', 'Biometric authentication failed');
        }
        return true;
      }
      default:
        throw new BridgeHandlerError('METHOD_NOT_FOUND', `Unknown biometrics method: ${method}`);
    }
  }
}
