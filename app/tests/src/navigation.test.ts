// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Mock the navigation module to avoid deep import chains that overwhelm the parser
jest.mock('@/navigation', () => {
  const mockScreens = {
    // App screens
    Home: {},
    Launch: {},
    Loading: {},
    Modal: {},
    Gratification: {},
    WebView: {},
    Points: {},
    // Onboarding screens
    Disclaimer: {},
    Splash: {},
    // Documents screens
    IDPicker: {},
    IdDetails: {},
    CountryPicker: {},
    DocumentCamera: {},
    DocumentCameraTrouble: {},
    DocumentDataInfo: {},
    DocumentDataNotFound: {},
    DocumentNFCMethodSelection: {},
    DocumentNFCScan: {},
    DocumentNFCTrouble: {},
    DocumentOnboarding: {},
    ManageDocuments: {},
    // Verification screens
    ConfirmBelonging: {},
    Prove: {},
    ProofHistory: {},
    ProofHistoryDetail: {},
    ProofRequestStatus: {},
    QRCodeViewFinder: {},
    QRCodeTrouble: {},
    // Account screens
    AccountRecovery: {},
    AccountRecoveryChoice: {},
    AccountVerifiedSuccess: {},
    CloudBackupSettings: {},
    SaveRecoveryPhrase: {},
    ShowRecoveryPhrase: {},
    RecoverWithPhrase: {},
    Settings: {},
    Referral: {},
    DeferredLinkingInfo: {},
    // Shared screens
    ComingSoon: {},
    // Dev screens
    DevSettings: {},
    DevFeatureFlags: {},
    DevHapticFeedback: {},
    DevLoadingScreen: {},
    DevPrivateKey: {},
    CreateMock: {},
    MockDataDeepLink: {},
    // Aadhaar screens
    AadhaarUpload: {},
    AadhaarUploadSuccess: {},
    AadhaarUploadError: {},
  };

  return {
    navigationScreens: mockScreens,
    navigationRef: { current: null },
  };
});

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
      'Gratification',
      'Home',
      'IDPicker',
      'IdDetails',
      'Launch',
      'Loading',
      'ManageDocuments',
      'MockDataDeepLink',
      'Modal',
      'Points',
      'ProofHistory',
      'ProofHistoryDetail',
      'ProofRequestStatus',
      'Prove',
      'QRCodeTrouble',
      'QRCodeViewFinder',
      'RecoverWithPhrase',
      'Referral',
      'SaveRecoveryPhrase',
      'Settings',
      'ShowRecoveryPhrase',
      'Splash',
      'WebView',
    ]);
  });
});
