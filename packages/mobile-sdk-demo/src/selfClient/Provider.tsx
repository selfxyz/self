import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { createSelfClient, SdkEvents, type Adapters, type SelfClient } from '@selfxyz/mobile-sdk-alpha';

import { createInMemoryDocumentsAdapter } from './inMemoryDocumentsAdapter';

const SelfClientContext = createContext<SelfClient | null>(null);

function createStubAdapters(): Adapters {
  const documents = createInMemoryDocumentsAdapter();

  return {
    documents,
    scanner: {
      async scan() {
        throw new Error('Scanner adapter is not available in the demo environment.');
      },
    },
    network: {
      http: {
        async fetch() {
          throw new Error('HTTP adapter is not available in the demo environment.');
        },
      },
      ws: {
        connect() {
          throw new Error('WebSocket adapter is not available in the demo environment.');
        },
      },
    },
    crypto: {
      async hash(_data: Uint8Array) {
        return new Uint8Array();
      },
      async sign() {
        throw new Error('Signing is not supported in the demo environment.');
      },
    },
    auth: {
      async getPrivateKey() {
        return null;
      },
    },
  };
}

export function SelfClientProvider({ children }: PropsWithChildren): JSX.Element {
  const adapters = useMemo(() => createStubAdapters(), []);
  const listeners = useMemo(() => new Map<SdkEvents, Set<(payload: any) => void>>(), []);

  const client = useMemo(() => createSelfClient({ config: {}, adapters, listeners }), [adapters, listeners]);

  return <SelfClientContext.Provider value={client}>{children}</SelfClientContext.Provider>;
}

export function useSelfClient(): SelfClient {
  const client = useContext(SelfClientContext);
  if (!client) {
    throw new Error('useSelfClient must be used within a SelfClientProvider');
  }
  return client;
}
