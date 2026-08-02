// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
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

// Mock KYC SDK to prevent ES module parsing errors in isolateModules
jest.mock('@didit-protocol/sdk-react-native', () => ({
  __esModule: true,
  startVerification: jest.fn().mockResolvedValue({
    type: 'completed',
    session: { status: 'approved', sessionId: 'mock-session-id' },
  }),
  startVerificationWithWorkflow: jest.fn().mockResolvedValue({
    type: 'completed',
    session: { status: 'approved', sessionId: 'mock-session-id' },
  }),
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
        'AadhaarPdfPassword',
        'AadhaarSelectVersion',
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
        'DataConfirmation',
        'DeferredLinkingInfo',
        'DevApduCapture',
        'DevDangerZone',
        'DevFeatureFlags',
        'DevHapticFeedback',
        'DevLoadingScreen',
        'DevNfcDebug',
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
        'KYCVerified',
        'KycConnectionError',
        'KycFailure',
        'KycSuccess',
        'Loading',
        'LogoConfirmation',
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
        'RegistrationFallbackMRZ',
        'RegistrationFallbackNFC',
        'SaveRecoveryPhrase',
        'SecurityAndBackup',
        'Settings',
        'ShowRecoveryPhrase',
        'SocialLoginDemo',
        'Splash',
        'StarfallPushCode',
        'Support',
        'Troubleshooting',
        'WebView',
        'WebViewHost',
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
