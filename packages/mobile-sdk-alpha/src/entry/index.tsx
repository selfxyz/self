// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

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
