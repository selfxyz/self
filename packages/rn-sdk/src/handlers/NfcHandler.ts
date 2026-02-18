// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';
import type { MessageRouter } from '../bridge/MessageRouter';

export interface NfcManagerModule {
  isSupported(): Promise<boolean>;
  start(): Promise<void>;
  requestTechnology(tech: string): Promise<void>;
  getTag(): Promise<{ id?: string } | null>;
  cancelTechnologyRequest(): Promise<void>;
}

export interface NfcTechEnum {
  IsoDep: string;
  [key: string]: string;
}

interface NfcDeps {
  manager: NfcManagerModule;
  tech: NfcTechEnum;
}

function loadNfc(): NfcDeps | undefined {
  try {
    const mod = require('react-native-nfc-manager');
    return { manager: mod.default, tech: mod.NfcTech };
  } catch {
    return undefined;
  }
}

export class NfcHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'nfc';
  private readonly router: MessageRouter;
  private readonly nfc: NfcDeps | undefined;
  private scanning = false;

  constructor(router: MessageRouter, nfc?: NfcDeps) {
    this.router = router;
    this.nfc = nfc ?? loadNfc();
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.nfc) {
      throw new BridgeHandlerError('NOT_AVAILABLE', 'react-native-nfc-manager is not installed');
    }

    switch (method) {
      case 'isSupported':
        return this.nfc.manager.isSupported();
      case 'scan':
        return this.scan(params);
      case 'cancelScan':
        return this.cancelScan();
      default:
        throw new BridgeHandlerError('METHOD_NOT_FOUND', `Unknown nfc method: ${method}`);
    }
  }

  private async scan(params: Record<string, unknown>): Promise<unknown> {
    const { manager, tech } = this.nfc!;

    if (this.scanning) {
      throw new BridgeHandlerError('ALREADY_SCANNING', 'An NFC scan is already in progress');
    }

    const supported = await manager.isSupported();
    if (!supported) {
      throw new BridgeHandlerError('NFC_NOT_SUPPORTED', 'NFC is not supported on this device');
    }

    this.scanning = true;
    this.pushProgress('initializing', 0);

    try {
      await manager.start();
      this.pushProgress('waiting_for_tag', 10);

      const nfcTech = Platform.OS === 'ios' ? tech.IsoDep : tech.IsoDep;

      await manager.requestTechnology(nfcTech);
      this.pushProgress('tag_discovered', 30);

      const tag = await manager.getTag();
      this.pushProgress('connected', 50);

      return {
        connected: true,
        tagId: tag?.id ?? null,
        techType: nfcTech,
        params,
      };
    } catch (err) {
      this.pushProgress('error', 0);
      throw new BridgeHandlerError(
        'NFC_SCAN_FAILED',
        err instanceof Error ? err.message : 'NFC scan failed',
      );
    } finally {
      this.scanning = false;
      try {
        await manager.cancelTechnologyRequest();
      } catch {
        // cleanup best-effort
      }
    }
  }

  private async cancelScan(): Promise<unknown> {
    const { manager } = this.nfc!;

    this.scanning = false;
    try {
      await manager.cancelTechnologyRequest();
    } catch {
      // already cancelled or no active session
    }
    return { cancelled: true };
  }

  private pushProgress(step: string, percent: number): void {
    this.router.pushEvent('nfc', 'scanProgress', { step, percent });
  }
}
