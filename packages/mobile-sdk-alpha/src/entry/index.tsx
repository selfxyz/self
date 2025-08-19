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
