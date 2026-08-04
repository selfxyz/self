// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';

export interface CustodyState {
  initialized: boolean;
  unlocked: boolean;
  mode: 'password' | 'passkey' | null;
  passkeyEnabled: boolean;
}

export interface CustodyLinkSession {
  qrContent: string;
  ttlMs: number;
}

export interface CustodyLinkEvent {
  stage: 'waiting' | 'hello' | 'imported' | 'expired' | 'done' | 'error';
  sas?: string[];
  docCount?: number;
  message?: string;
}

export interface CustodyUnlockResult {
  ok: boolean;
  cooldownMs?: number;
}

export interface PasswordStrength {
  score: number;
  label: string;
}

export interface BridgeCustodyAdapter {
  lock(): Promise<void>;
  reset(): Promise<void>;
  state(): Promise<CustodyState>;
  passwordStrength(password: string): Promise<PasswordStrength>;
  createLinkSession(): Promise<CustodyLinkSession>;
  cancelLinkSession(): Promise<void>;
  completeLink(
    kind: 'password' | 'passkey',
    password?: string,
  ): Promise<{ ok: boolean; docCount: number }>;
  unlock(password: string): Promise<CustodyUnlockResult>;
  unlockWithPasskey(): Promise<CustodyUnlockResult>;
  enablePasskey(): Promise<void>;
  onLinkEvent(handler: (event: CustodyLinkEvent) => void): () => void;
}

export function bridgeCustodyAdapter(bridge: WebViewBridge): BridgeCustodyAdapter {
  return {
    async lock(): Promise<void> {
      await bridge.request('custody', 'lock', {});
    },
    async reset(): Promise<void> {
      await bridge.request('custody', 'reset', {});
    },
    state(): Promise<CustodyState> {
      return bridge.request('custody', 'state', {});
    },
    passwordStrength(password: string): Promise<PasswordStrength> {
      return bridge.request('custody', 'passwordStrength', { password });
    },
    createLinkSession(): Promise<CustodyLinkSession> {
      return bridge.request('custody', 'createLinkSession', {});
    },
    async cancelLinkSession(): Promise<void> {
      await bridge.request('custody', 'cancelLinkSession', {});
    },
    completeLink(
      kind: 'password' | 'passkey',
      password?: string,
    ): Promise<{ ok: boolean; docCount: number }> {
      return bridge.request('custody', 'completeLink', { kind, password });
    },
    unlock(password: string): Promise<CustodyUnlockResult> {
      return bridge.request('custody', 'unlock', { password });
    },
    unlockWithPasskey(): Promise<CustodyUnlockResult> {
      return bridge.request('custody', 'unlockPasskey', {});
    },
    async enablePasskey(): Promise<void> {
      await bridge.request('custody', 'enablePasskey', {});
    },
    onLinkEvent(handler: (event: CustodyLinkEvent) => void): () => void {
      return bridge.on('custody', 'link', data =>
        handler(data as CustodyLinkEvent),
      );
    },
  };
}
