// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ComponentType, ReactNode } from 'react';
import { Text, View } from 'tamagui';

import { SelfClientProvider } from '../context';
import { useDocumentManager } from '../hooks/useDocumentManager';
import type { Adapters, Config } from '../types/public';
import type { ExternalAdapter, PassportCameraProps, ScreenProps } from '../types/ui';
import { OnboardingFlow } from './flows/OnboardingFlow';
import { QRCodeScreen } from './screens/QRCodeScreen';

interface SelfMobileSdkProps {
  config: Config;
  adapters?: Partial<Adapters>;
  external: ExternalAdapter;
  children?: ReactNode;
  // Optional custom components
  customScreens?: {
    PassportCamera?: ComponentType<PassportCameraProps>;
    NFCScanner?: ComponentType<ScreenProps>;
    QRScanner?: ReactNode;
  };
}

const SelfMobileSdkContent = ({
  external,
  customScreens = {},
}: {
  external: ExternalAdapter;
  customScreens?: SelfMobileSdkProps['customScreens'];
}) => {
  const { documents, isLoading, hasRegisteredDocuments } = useDocumentManager(external);

  if (isLoading) {
    return (
      <View>
        <Text>Loading documents...</Text>
      </View>
    );
  }

  // Check if user has any registered documents
  const hasDocuments = Object.keys(documents).length > 0 && hasRegisteredDocuments();

  if (!hasDocuments) {
    return (
      <OnboardingFlow
        external={external}
        setDocument={external.setDocument}
        PassportCamera={customScreens.PassportCamera}
        NFCScanner={customScreens.NFCScanner}
      />
    );
  }

  // Show disclosure flow
  return (
    customScreens.QRScanner || (
      <QRCodeScreen onSuccess={external.onDisclosureSuccess} onFailure={external.onDisclosureFailure} />
    )
  );
};

export const SelfMobileSdk = ({ config, adapters = {}, external, children, customScreens }: SelfMobileSdkProps) => {
  return (
    <SelfClientProvider config={config} adapters={adapters}>
      {children || <SelfMobileSdkContent external={external} customScreens={customScreens} />}
    </SelfClientProvider>
  );
};
