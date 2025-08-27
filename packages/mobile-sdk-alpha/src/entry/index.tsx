// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ReactNode } from 'react';

import { SelfClientProvider } from '../context';
import type { Adapters, Config } from '../types/public';

export interface SelfMobileSdkProps {
  config: Config;
  adapters?: Partial<Adapters>;
  children?: ReactNode;
}

export const SelfMobileSdk = ({ config, adapters = {}, children }: SelfMobileSdkProps) => (
  <SelfClientProvider config={config} adapters={adapters}>
    {children}
  </SelfClientProvider>
);
