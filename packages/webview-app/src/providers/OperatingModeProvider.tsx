// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { hasVerificationRequestParam } from '../utils/verificationRequest';
import { useBridge } from './BridgeProvider';

export type OperatingMode = 'self-app' | 'embed';

export interface OperatingModeContextValue {
  mode: OperatingMode;
  verificationRequest: VerificationRequestPayload | null;
  isReady: boolean;
  // Host-minted WebView reference session id (Sentry `reference_id`).
  // Undefined for old hosts / standalone browser mode.
  referenceId?: string;
}

export interface VerificationRequestPayload {
  userId?: string;
  scope?: string;
  disclosures?: string[];
  [key: string]: unknown;
}

interface HostConfigResponse {
  mode?: OperatingMode;
  verificationRequest?: VerificationRequestPayload | null;
  debug?: boolean;
  platform?: string;
  referenceId?: string;
}

const GETCONFIG_TIMEOUT_MS = 800;

// URL-param copy of the reference id, used as a fallback when getConfig has
// not resolved or the host omits it. The host appends it to the WebView URL.
function referenceIdFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search).get('referenceId') ?? undefined;
}

const Ctx = createContext<OperatingModeContextValue | null>(null);

export const OperatingModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bridge = useBridge();
  const [state, setState] = useState<OperatingModeContextValue>({
    mode: 'self-app',
    verificationRequest: null,
    isReady: false,
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const config = await bridge.request<HostConfigResponse>('lifecycle', 'getConfig', {}, GETCONFIG_TIMEOUT_MS);
        if (cancelled) return;
        const mode: OperatingMode = config?.mode === 'embed' ? 'embed' : 'self-app';
        setState({
          mode,
          verificationRequest: config?.verificationRequest ?? null,
          isReady: true,
          referenceId: config?.referenceId ?? referenceIdFromUrl(),
        });
      } catch {
        // getConfig unavailable: browser-host transport (which structurally can
        // never answer getConfig — only ready/setResult/dismiss cross to the
        // host), a missing transport, or a host that doesn't implement it.
        // getConfig stays authoritative when it answers; here it can't, so the
        // URL request signal picks the fallback direction. A `disclosures`/
        // `proofItems` param means an embed verification, so fall back to embed
        // — otherwise ModeDispatch renders the self-app tour, which dead-ends at
        // registration instead of the requested disclosure.
        if (cancelled) return;
        const embedFromUrl = hasVerificationRequestParam(window.location.search);
        setState({
          mode: embedFromUrl ? 'embed' : 'self-app',
          verificationRequest: null,
          isReady: true,
          referenceId: referenceIdFromUrl(),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bridge]);

  const value = useMemo(() => state, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useOperatingMode(): OperatingModeContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useOperatingMode must be used within an OperatingModeProvider');
  }
  return ctx;
}

// Reactive selector for the host-minted reference id. Reads from context so a
// consumer re-renders if the id resolves after first paint (getConfig is async).
export function useReferenceId(): string | undefined {
  return useOperatingMode().referenceId;
}

export function hasValidVerificationRequest(
  request: VerificationRequestPayload | null,
): request is VerificationRequestPayload {
  if (!request) return false;
  if (typeof request.userId !== 'string' || request.userId.length === 0) return false;
  if (typeof request.scope !== 'string' || request.scope.length === 0) return false;
  return true;
}
