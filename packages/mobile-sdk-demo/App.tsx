// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';

import type { DocumentCatalog, DocumentMetadata, IDDocument } from '@selfxyz/common/utils/types';
import { loadSelectedDocument, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import HomeScreen from './src/screens/HomeScreen';
import type { ScreenContext, ScreenRoute } from './src/screens';
import { screenMap } from './src/screens';
import SelfClientProvider from './src/providers/SelfClientProvider';

type SelectedDocumentState = {
  data: IDDocument;
  metadata: DocumentMetadata;
};

type NavigationState = {
  screen: ScreenRoute;
  setScreen: (screen: ScreenRoute, params?: any) => void;
  screenParams: any;
};

function DemoApp({ navigationState }: { navigationState: NavigationState }) {
  const selfClient = useSelfClient();
  const { screen, setScreen, screenParams } = navigationState;

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

  const navigate = useCallback((next: ScreenRoute, params?: any) => setScreen(next, params), [setScreen]);

  const screenContext: ScreenContext = {
    navigate,
    goHome: () => setScreen('home'),
    documentCatalog: catalog,
    selectedDocument,
    refreshDocuments,
  };

  useEffect(() => {
    if (screen !== 'home' && !screenMap[screen]) {
      setScreen('home');
    }
  }, [screen]);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  if (screen === 'home') {
    return <HomeScreen screenContext={screenContext} />;
  }

  const descriptor = screenMap[screen];

  if (!descriptor) {
    return null;
  }

  const ScreenComponent = descriptor.load();
  const props = descriptor.getProps?.(screenContext, screenParams) ?? {};

  return <ScreenComponent {...props} />;
}

function App() {
  const [screen, setScreen] = useState<ScreenRoute>('home');
  const [screenParams, setScreenParams] = useState<any>(undefined);

  const handleSetScreen = useCallback((nextScreen: ScreenRoute, params?: any) => {
    setScreen(nextScreen);
    setScreenParams(params);
  }, []);

  return (
    <SelfClientProvider onNavigate={screenId => handleSetScreen(screenId as ScreenRoute)}>
      <DemoApp navigationState={{ screen, setScreen: handleSetScreen, screenParams }} />
    </SelfClientProvider>
  );
}

export default App;
