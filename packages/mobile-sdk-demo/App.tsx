// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';

import type { DocumentCatalog, DocumentMetadata, IDDocument } from '@selfxyz/common/utils/types';
import { loadSelectedDocument, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import HomeScreen from './src/screens/HomeScreen';
import type { ScreenContext, ScreenId, ScreenRoute } from './src/screens';
import { screenMap } from './src/screens';
import SelfClientProvider from './src/providers/SelfClientProvider';
import { NavigationProvider, useNavigation, type ScreenName } from './src/navigation/NavigationProvider';

type SelectedDocumentState = {
  data: IDDocument;
  metadata: DocumentMetadata;
};

const routeMap: Record<ScreenId, ScreenName> = {
  generate: 'Generate',
  register: 'Register',
  mrz: 'MRZ',
  home: 'Home',
  nfc: 'NFC',
  documents: 'Documents',
  'country-selection': 'CountrySelection',
  'id-selection': 'IDSelection',
  success: 'Success',
};

const screenToRoute = Object.entries(routeMap).reduce(
  (acc, [key, value]) => {
    acc[value as unknown as ScreenName] = key as unknown as ScreenId;
    return acc;
  },
  {} as Record<ScreenName, ScreenId>,
);

function DemoApp() {
  const selfClient = useSelfClient();
  const navigation = useNavigation();

  const [catalog, setCatalog] = useState<DocumentCatalog>({ documents: [] });
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocumentState | null>(null);

  const refreshDocuments = useCallback(async () => {
    try {
      const selected = await loadSelectedDocument(selfClient);
      const nextCatalog = await selfClient.loadDocumentCatalog();
      setCatalog(nextCatalog);
      setSelectedDocument(selected);
    } catch (error) {
      console.warn('Failed to refresh documents', error);
      setCatalog({ documents: [] });
      setSelectedDocument(null);
    }
  }, [selfClient]);

  const navigate = useCallback(
    (next: ScreenRoute) => {
      const routeName = routeMap[next];
      if (routeName) {
        navigation.navigate(routeName);
      }
    },
    [navigation],
  );

  const screenContext: ScreenContext = {
    navigate,
    goHome: () => navigation.navigate('Home'),
    documentCatalog: catalog,
    selectedDocument,
    refreshDocuments,
  };

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  const renderCurrentScreen = () => {
    const { currentScreen } = navigation;

    if (currentScreen === 'Home') {
      return <HomeScreen screenContext={screenContext} />;
    }

    const screenRoute = screenToRoute[currentScreen];
    if (screenRoute && screenMap[screenRoute]) {
      const descriptor = screenMap[screenRoute];
      const ScreenComponent = descriptor.load();
      const props = descriptor.getProps?.(screenContext) ?? {};
      return <ScreenComponent {...props} />;
    }

    return <HomeScreen screenContext={screenContext} />;
  };

  return renderCurrentScreen();
}

function App() {
  return (
    <NavigationProvider>
      <SelfClientProvider>
        <DemoApp />
      </SelfClientProvider>
    </NavigationProvider>
  );
}

export default App;
