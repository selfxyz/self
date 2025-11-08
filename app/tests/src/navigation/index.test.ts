// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Mock ConfirmIdentificationScreen to avoid PixelRatio issues
jest.mock(
  '@selfxyz/mobile-sdk-alpha/onboarding/confirm-identification',
  () => ({
    ConfirmIdentificationScreen: ({ children }: any) => children,
  }),
);

describe('navigation', () => {
  it('should have the correct navigation screens', () => {
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
      'WebView',
    ]);
  });
});
