// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
      'ConfirmBelonging',
      'CreateMock',
      'DeferredLinkingInfo',
      'DevFeatureFlags',
      'DevHapticFeedback',
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
      'UnsupportedDocument',
    ]);
  });

  describe('Aesop design screen overrides', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should use regular passport screens when shouldShowAesopRedesign is false', () => {
      const navigationScreens = require('@/navigation').navigationScreens;
      expect(
        navigationScreens.DocumentOnboarding.options.title,
      ).toBeUndefined();
    });

    it('should use aesop design passport screens when shouldShowAesopRedesign is true', () => {
      jest.mock('@/hooks/useAesopRedesign', () => ({
        shouldShowAesopRedesign: jest.fn().mockReturnValue(true),
      }));

      const navigationScreens = require('@/navigation').navigationScreens;
      expect(navigationScreens.DocumentOnboarding.options.title).toBeDefined();
    });
  });
});
