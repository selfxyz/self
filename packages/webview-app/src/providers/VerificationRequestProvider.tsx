// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import type { ParsedVerificationRequestContext } from '../utils/verificationRequest';
import { parseVerificationRequestContext } from '../utils/verificationRequest';

export type VerificationRequestContext = ParsedVerificationRequestContext;

const Ctx = createContext<VerificationRequestContext | null>(null);

export const VerificationRequestProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { search } = useLocation();
  const value = useMemo(
    () => parseVerificationRequestContext(search || window.location.search),
    [search],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useVerificationRequest(): VerificationRequestContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useVerificationRequest must be used within a VerificationRequestProvider');
  }
  return ctx;
}
