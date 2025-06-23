//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React, { createContext, useEffect } from 'react';

import { useProofHistoryStore } from '../stores/proofHistoryStore';

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
