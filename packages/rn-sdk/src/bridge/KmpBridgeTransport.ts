// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { NativeEventEmitter, NativeModules, type EmitterSubscription } from 'react-native';

const MODULE_NAME = 'SelfBridge';
const EVENT_NAME = 'SelfBridge:injection';

interface SelfBridgeNativeModule {
  routeMessage(rawJson: string): void;
}

export interface KmpBridgeTransportConfig {
  inject: (js: string) => void;
  debug?: boolean;
}

export class KmpBridgeTransport {
  private readonly nativeModule: SelfBridgeNativeModule | undefined;
  private readonly subscription: EmitterSubscription | undefined;
  private readonly config: KmpBridgeTransportConfig;

  constructor(config: KmpBridgeTransportConfig) {
    this.config = config;
    const mod = (NativeModules as Record<string, unknown>)[MODULE_NAME] as
      | SelfBridgeNativeModule
      | undefined;
    if (!mod) {
      this.nativeModule = undefined;
      this.subscription = undefined;
      if (config.debug) {
        console.warn('[KmpBridgeTransport] Native SelfBridge module not linked');
      }
      return;
    }
    this.nativeModule = mod;
    const emitter = new NativeEventEmitter(mod as unknown as ConstructorParameters<typeof NativeEventEmitter>[0]);
    this.subscription = emitter.addListener(EVENT_NAME, (js: string) => {
      try {
        this.config.inject(js);
      } catch (err) {
        if (this.config.debug) {
          console.error('[KmpBridgeTransport] inject failed', err);
        }
      }
    });
  }

  isAvailable(): boolean {
    return this.nativeModule !== undefined;
  }

  dispatch(rawJson: string): void {
    if (!this.nativeModule) {
      throw new Error('SelfBridge native module not available');
    }
    this.nativeModule.routeMessage(rawJson);
  }

  dispose(): void {
    this.subscription?.remove();
  }
}
