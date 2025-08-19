import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

import { createSelfClient } from './client';
import type { Adapters, Config, SelfClient } from './types/public';

const SelfClientContext = createContext<SelfClient | null>(null);

export interface SelfClientProviderProps {
  config: Config;
  adapters?: Partial<Adapters>;
}

export { SelfClientContext };

export function SelfClientProvider({ config, adapters = {}, children }: PropsWithChildren<SelfClientProviderProps>) {
  const [client, setClient] = useState<SelfClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const clientInstance = createSelfClient({ config, adapters });
    setClient(clientInstance);
    setIsLoading(false);
  }, [config, adapters]);

  if (isLoading) {
    return <div>Loading...</div>; // Simple loading state, can be customized
  }

  return <SelfClientContext.Provider value={client}>{children}</SelfClientContext.Provider>;
}

export function useSelfClient(): SelfClient {
  const ctx = useContext(SelfClientContext);
  if (!ctx) throw new Error('useSelfClient must be used within a SelfClientProvider');
  return ctx;
}
