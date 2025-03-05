import React, { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface ConnectedAppLayoutProps extends PropsWithChildren {}

export default function ConnectedAppLayout({
  children,
}: ConnectedAppLayoutProps): JSX.Element {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
