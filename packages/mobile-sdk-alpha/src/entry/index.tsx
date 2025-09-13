// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ReactNode } from 'react';

import { SelfClientProvider } from '../context';
import { SDKEvent } from '../types/events';
import type { Adapters, Config } from '../types/public';

export interface SelfMobileSdkProps {
  config: Config;
  adapters: Adapters;
  listeners: Map<SDKEvent, Set<(p: any) => void>>;
  children?: ReactNode;
}

export const SelfMobileSdk = ({ config, adapters, listeners, children }: SelfMobileSdkProps) => (
  <SelfClientProvider config={config} adapters={adapters} listeners={listeners}>
    {children}
  </SelfClientProvider>
);
