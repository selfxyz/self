// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { createContext, useEffect } from 'react';

import { useProofHistoryStore } from '@/stores/proofHistoryStore';

export const DatabaseContext = createContext(null);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { initDatabase } = useProofHistoryStore();

  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

  return (
    <DatabaseContext.Provider value={null}>{children}</DatabaseContext.Provider>
  );
};
