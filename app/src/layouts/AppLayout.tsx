import React, { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface ConnectedAppLayoutProps extends PropsWithChildren {}

export default function ConnectedAppLayout({
  children,
}: ConnectedAppLayoutProps) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
