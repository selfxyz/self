// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { createSelfClient } from './client';
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
  adapters?: Partial<Adapters>;
}

export { SelfClientContext };

/**
 * Provides a memoised {@link SelfClient} instance to all descendant components
 * via {@link SelfClientContext}.
 *
 * Consumers should ensure that `config` and `adapters` are referentially stable
 * (e.g. wrapped in `useMemo`) to avoid recreating the client on every render.
 */
export function SelfClientProvider({ config, adapters = {}, children }: PropsWithChildren<SelfClientProviderProps>) {
  const client = useMemo(() => createSelfClient({ config, adapters }), [config, adapters]);

  return <SelfClientContext.Provider value={client}>{children}</SelfClientContext.Provider>;
}

/**
 * Retrieves the current {@link SelfClient} from context.
 *
 * @throws If used outside of a {@link SelfClientProvider}.
 */
export function useSelfClient(): SelfClient {
  const ctx = useContext(SelfClientContext);
  if (!ctx) throw new Error('useSelfClient must be used within a SelfClientProvider');
  return ctx;
}
