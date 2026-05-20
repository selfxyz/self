// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useBridge } from './BridgeProvider';

export type OperatingMode = 'wallet' | 'tunnel';

export interface OperatingModeContextValue {
  mode: OperatingMode;
  verificationRequest: VerificationRequestPayload | null;
  isReady: boolean;
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
}

const GETCONFIG_TIMEOUT_MS = 800;

const Ctx = createContext<OperatingModeContextValue | null>(null);

export const OperatingModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const bridge = useBridge();
  const [state, setState] = useState<OperatingModeContextValue>({
    mode: 'wallet',
    verificationRequest: null,
    isReady: false,
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const config = await bridge.request<HostConfigResponse>(
          'lifecycle',
          'getConfig',
          {},
          GETCONFIG_TIMEOUT_MS,
        );
        if (cancelled) return;
        const mode: OperatingMode = config?.mode === 'tunnel' ? 'tunnel' : 'wallet';
        setState({
          mode,
          verificationRequest: config?.verificationRequest ?? null,
          isReady: true,
        });
      } catch {
        // Browser-host fallback, missing transport, or a host that doesn't
        // implement getConfig: default to wallet. Tunnel requires explicit
        // host signaling.
        if (cancelled) return;
        setState({
          mode: 'wallet',
          verificationRequest: null,
          isReady: true,
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

export function hasValidVerificationRequest(
  request: VerificationRequestPayload | null,
): request is VerificationRequestPayload {
  if (!request) return false;
  if (typeof request.userId !== 'string' || request.userId.length === 0) return false;
  if (typeof request.scope !== 'string' || request.scope.length === 0) return false;
  return true;
}
