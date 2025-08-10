// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

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
