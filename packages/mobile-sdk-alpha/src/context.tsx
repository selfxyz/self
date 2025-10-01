// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createContext, type PropsWithChildren, useContext, useEffect, useMemo } from 'react';

import { createSelfClient } from './client';
import { loadSelectedDocument } from './documents/utils';
import { SdkEvents } from './types/events';
import type { Adapters, Config, SelfClient } from './types/public';

/**
 * React context holding a {@link SelfClient} instance.
 *
 * The context is intentionally initialised with `null` so that consumers
 * outside of a {@link SelfClientProvider} can be detected and an informative
 * error can be thrown.
 */
const SelfClientContext = createContext<SelfClient | null>(null);

/**
 * Props for {@link SelfClientProvider}.
 *
 * @public
 */
export interface SelfClientProviderProps {
  /** SDK configuration options. */
  config: Config;
  /**
   * Partial set of adapter implementations. Any missing optional adapters will
   * be replaced with default no-op implementations.
   */
  adapters: Adapters;
  /**
   * Map of event listeners.
   */
  listeners: Map<SdkEvents, Set<(p: any) => void>>;
}

export { SelfClientContext };

/**
 * Provides a memoised {@link SelfClient} instance to all descendant components
 * via {@link SelfClientContext}.
 *
 * Consumers should ensure that `config` and `adapters` are referentially stable
 * (e.g. wrapped in `useMemo`) to avoid recreating the client on every render.
 */
export function SelfClientProvider({
  config,
  adapters,
  listeners,
  children,
}: PropsWithChildren<SelfClientProviderProps>) {
  const client = useMemo(() => createSelfClient({ config, adapters, listeners }), [config, adapters, listeners]);

  return <SelfClientContext.Provider value={client}>{children}</SelfClientContext.Provider>;
}

export function usePrepareDocumentProof() {
  const selfClient = useSelfClient();
  const { useProvingStore } = selfClient;
  const currentState = useProvingStore(state => state.currentState);
  const init = useProvingStore(state => state.init);
  const setUserConfirmed = useProvingStore(state => state.setUserConfirmed);
  const isReadyToProve = currentState === 'ready_to_prove';

  useEffect(() => {
    const initializeProving = async () => {
      try {
        const selectedDocument = await loadSelectedDocument(selfClient);
        if (selectedDocument?.data?.documentCategory === 'aadhaar') {
          init(selfClient, 'register');
        } else {
          init(selfClient, 'dsc');
        }
      } catch (error) {
        console.error('Error loading selected document:', error);
        init(selfClient, 'dsc');
      }
    };

    initializeProving();
  }, [init, selfClient]);

  return { setUserConfirmed, isReadyToProve };
}

/**
 * Retrieves the current {@link SelfClient} from context.
 *
 * @throws If used outside of a {@link SelfClientProvider}.
 */
export function useSelfClient(): SelfClient {
  const client = useContext(SelfClientContext);
  if (!client) throw new Error('useSelfClient must be used within a SelfClientProvider');
  return client;
}
