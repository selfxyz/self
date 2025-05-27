import React, { createContext, useEffect } from 'react';

import { useProofHistoryStore } from './proofHistoryStore';

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
