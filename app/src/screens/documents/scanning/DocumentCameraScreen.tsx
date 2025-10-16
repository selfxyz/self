// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import {
  hasAnyValidRegisteredDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';

import useHapticNavigation from '@/hooks/useHapticNavigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentCameraScreen as SDKDocumentCameraScreen } from '@selfxyz/mobile-sdk-alpha/onboarding/document-camera-screen';

const DocumentCameraScreen: React.FC = () => {
  const safeAreaInsets = useSafeAreaInsets();
  const client = useSelfClient();
  const navigateToLaunch = useHapticNavigation('Launch', {
    action: 'cancel',
  });
  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });

  const onCancelPress = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument(client);
    if (hasValidDocument) {
      navigateToHome();
    } else {
      navigateToLaunch();
    }
  };

  return (
    <SDKDocumentCameraScreen
      // no need to pass onSuccess prop as it will be handled by listening
      // to the SdkEvents.DOCUMENT_MRZ_READ_SUCCESS event
      onBack={onCancelPress}
      safeAreaInsets={safeAreaInsets}
    />
  );
};

export default DocumentCameraScreen;
