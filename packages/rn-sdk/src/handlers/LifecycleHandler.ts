// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';
import type { VerificationRequest, VerificationResult, SelfSdkError } from '../SelfVerification';

export type OperatingMode = 'wallet' | 'tunnel';

interface LifecycleConfig {
  request: VerificationRequest;
  onSuccess: (result: VerificationResult) => void;
  onFailure: (error: SelfSdkError) => void;
  onCancelled: () => void;
  debug: boolean;
  mode?: OperatingMode;
}

export class LifecycleHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'lifecycle';
  private readonly config: LifecycleConfig;

  constructor(config: LifecycleConfig) {
    this.config = config;
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'ready':
        return null;
      case 'getConfig':
        return {
          mode: this.config.mode ?? 'wallet',
          verificationRequest: this.config.request,
          debug: this.config.debug,
          platform: 'react-native',
        };
      case 'setResult':
        return this.setResult(params);
      case 'dismiss':
        this.config.onCancelled();
        return null;
      default:
        throw new BridgeHandlerError(
          'METHOD_NOT_FOUND',
          `Unknown lifecycle method: ${method}`,
        );
    }
  }

  private setResult(params: Record<string, unknown>): null {
    const type = params.type as string | undefined;
    const success = params.success === true || params.success === 'true';
    const errorCode = params.errorCode as string | undefined;
    const errorMessage = params.errorMessage as string | undefined;

    if (type) {
      // Flat lifecycle payload (e.g. { type: 'proofRequested' }) — treat as success
      this.config.onSuccess({
        success: true,
        userId: params.userId as string | undefined,
        verificationId: params.verificationId as string | undefined,
        proof: params.proof,
        claims: params.claims as Record<string, unknown> | undefined,
      });
    } else if (success) {
      this.config.onSuccess({
        success: true,
        userId: params.userId as string | undefined,
        verificationId: params.verificationId as string | undefined,
        proof: params.proof,
        claims: params.claims as Record<string, unknown> | undefined,
      });
    } else if (errorCode) {
      this.config.onFailure({
        code: errorCode,
        message: errorMessage ?? 'Unknown error',
      });
    } else {
      this.config.onCancelled();
    }

    return null;
  }
}
