// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useState } from 'react';

import type { IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';

import HomeScreen from './src/screens/HomeScreen';
import { screenMap, type ScreenContext, type ScreenRoute } from './src/screens';

function App() {
  const [screen, setScreen] = useState<ScreenRoute>('home');
  const [mockDocument, setMockDocument] = useState<IDDocument | null>(null);

  const navigate = (next: ScreenRoute) => setScreen(next);

  const screenContext: ScreenContext = {
    navigate,
    goHome: () => setScreen('home'),
    mockDocument,
    setMockDocument,
  };

  useEffect(() => {
    if (screen !== 'home' && !screenMap[screen]) {
      setScreen('home');
    }
  }, [screen]);

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

export default App;
