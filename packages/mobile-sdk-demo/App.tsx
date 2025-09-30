// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';

import type { DocumentCatalog, DocumentMetadata } from '@selfxyz/common/dist/esm/src/utils/types.js';
import type { IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';
import { loadSelectedDocument, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import HomeScreen from './src/screens/HomeScreen';
import { screenMap, type ScreenContext, type ScreenRoute } from './src/screens';
import SelfClientProvider from './src/providers/SelfClientProvider';

type SelectedDocumentState = {
  data: IDDocument;
  metadata: DocumentMetadata;
};

function DemoApp() {
  const selfClient = useSelfClient();

  const [screen, setScreen] = useState<ScreenRoute>('home');
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

  const navigate = (next: ScreenRoute) => setScreen(next);

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
  const props = descriptor.getProps?.(screenContext) ?? {};

  return <ScreenComponent {...props} />;
}

function App() {
  return (
    <SelfClientProvider>
      <DemoApp />
    </SelfClientProvider>
  );
}

export default App;
