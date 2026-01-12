// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/hooks/useRecoveryPrompts', () => jest.fn());
jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(() => ({})),
}));
jest.mock('@/navigation/deeplinks', () => ({
  setupUniversalLinkListenerInNavigation: jest.fn(() => jest.fn()),
}));
jest.mock('@/services/analytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    flush: jest.fn(),
  })),
  trackEvent: jest.fn(),
  trackScreenView: jest.fn(),
  flush: jest.fn(),
}));

describe('navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have the correct navigation screens', () => {
    // Unmock @/navigation for this test to get the real navigationScreens
    jest.unmock('@/navigation');
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
        'DocumentSelectorForProving',
        'Gratification',
        'Home',
        'IDPicker',
        'IdDetails',
        'Loading',
        'ManageDocuments',
        'MockDataDeepLink',
        'Modal',
        'Points',
        'PointsInfo',
        'ProofHistory',
        'ProofHistoryDetail',
        'ProofRequestStatus',
        'ProofSettings',
        'Prove',
        'ProvingScreenRouter',
        'QRCodeTrouble',
        'QRCodeViewFinder',
        'RecoverWithPhrase',
        'Referral',
        'SaveRecoveryPhrase',
        'Settings',
        'ShowRecoveryPhrase',
        'Splash',
        'StarfallPushCode',
        'WebView',
      ]);
    });
  });

  it('wires recovery prompts hook into navigation', () => {
    // Temporarily restore the React mock and unmock @/navigation for this test
    jest.unmock('@/navigation');
    const useRecoveryPrompts =
      require('@/hooks/useRecoveryPrompts') as jest.Mock;

    // Since we're testing the wiring and not the actual rendering,
    // we can just check if the module exports the default component
    // and verify the hook is called when the component is imported
    const navigation = require('@/navigation');
    expect(navigation.default).toBeDefined();

    // Render the component to trigger the hooks
    const NavigationWithTracking = navigation.default;
    render(<NavigationWithTracking />);

    expect(useRecoveryPrompts).toHaveBeenCalledWith();
  });
});
