// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render } from '@testing-library/react-native';

import { RECOVERY_PROMPT_ALLOWED_ROUTES } from '@/consts/recoveryPrompts';

const mockNavigationRef = {
  isReady: jest.fn(() => true),
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  getCurrentRoute: jest.fn(() => ({ name: 'Home' })),
} as any;

jest.mock('@/hooks/useRecoveryPrompts', () => jest.fn());
jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(() => ({})),
}));
jest.mock('@/utils/deeplinks', () => ({
  setupUniversalLinkListenerInNavigation: jest.fn(() => jest.fn()),
}));
jest.mock('@/utils/analytics', () => jest.fn(() => ({
  trackScreenView: jest.fn(),
})));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    createNavigationContainerRef: jest.fn(() => mockNavigationRef),
    createStaticNavigation: jest.fn(() =>
      React.forwardRef((props: any) => <>{props.children}</>),
    ),
  };
});
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn((config) => config),
}));

describe('navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have the correct navigation screens', () => {
    jest.isolateModules(() => {
      const navigationScreens = require('@/navigation').navigationScreens;
      const listOfScreens = Object.keys(navigationScreens).sort();
      expect(listOfScreens).toEqual([
        'AadhaarUpload',
        'AadhaarUploadError',
        'AadhaarUploadSuccess',
        'AccountRecovery',
        'AccountRecoveryChoice',
        'AccountVerifiedSuccess',
        'CloudBackupSettings',
        'ComingSoon',
        'ConfirmBelonging',
        'CountryPicker',
        'CreateMock',
        'DeferredLinkingInfo',
        'DevFeatureFlags',
        'DevHapticFeedback',
        'DevLoadingScreen',
        'DevPrivateKey',
        'DevSettings',
        'Disclaimer',
        'DocumentCamera',
        'DocumentCameraTrouble',
        'DocumentDataInfo',
        'DocumentDataNotFound',
        'DocumentNFCMethodSelection',
        'DocumentNFCScan',
        'DocumentNFCTrouble',
        'DocumentOnboarding',
        'Home',
        'IDPicker',
        'IdDetails',
        'Launch',
        'Loading',
        'ManageDocuments',
        'MockDataDeepLink',
        'Modal',
        'ProofHistory',
        'ProofHistoryDetail',
        'ProofRequestStatus',
        'Prove',
        'QRCodeTrouble',
        'QRCodeViewFinder',
        'RecoverWithPhrase',
        'SaveRecoveryPhrase',
        'Settings',
        'ShowRecoveryPhrase',
        'Splash',
      ]);
    });
  });

  it('wires recovery prompts hook into navigation', () => {
    const useRecoveryPrompts = require('@/hooks/useRecoveryPrompts') as jest.Mock;
    jest.isolateModules(() => {
      const NavigationWithTracking = require('@/navigation').default;
      render(<NavigationWithTracking />);
    });
    expect(useRecoveryPrompts).toHaveBeenCalledWith({
      allowedRoutes: RECOVERY_PROMPT_ALLOWED_ROUTES,
    });
  });
});
