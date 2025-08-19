import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { createSelfClient } from './client';
import type { Adapters, Config, SelfClient } from './types/public';

const SelfClientContext = createContext<SelfClient | null>(null);

export interface SelfClientProviderProps {
  config: Config;
  adapters?: Partial<Adapters>;
}

export { SelfClientContext };

export function SelfClientProvider({ config, adapters = {}, children }: PropsWithChildren<SelfClientProviderProps>) {
  const client = useMemo(() => createSelfClient({ config, adapters }), [config, adapters]);
  return <SelfClientContext.Provider value={client}>{children}</SelfClientContext.Provider>;
}

export function useSelfClient(): SelfClient {
  const ctx = useContext(SelfClientContext);
  if (!ctx) throw new Error('useSelfClient must be used within a SelfClientProvider');
  return ctx;
}
