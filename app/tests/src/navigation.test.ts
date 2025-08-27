// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

describe('navigation', () => {
  it('should have the correct navigation screens', () => {
    const navigationScreens = require('@/navigation').navigationScreens;
    const listOfScreens = Object.keys(navigationScreens).sort();
    expect(listOfScreens).toEqual([
      'AccountRecovery',
      'AccountRecoveryChoice',
      'AccountVerifiedSuccess',
      'CloudBackupSettings',
      'ConfirmBelongingScreen',
      'CreateMock',
      'DeferredLinkingInfo',
      'DevFeatureFlags',
      'DevHapticFeedback',
      'DevPrivateKey',
      'DevSettings',
      'Disclaimer',
      'Home',
      'Launch',
      'LoadingScreen',
      'ManageDocuments',
      'MockDataDeepLink',
      'Modal',
      'PassportCamera',
      'PassportCameraTrouble',
      'PassportDataInfo',
      'PassportDataNotFound',
      'PassportNFCMethodSelection',
      'PassportNFCScan',
      'PassportNFCTrouble',
      'PassportOnboarding',
      'ProofHistory',
      'ProofHistoryDetail',
      'ProofRequestStatusScreen',
      'ProveScreen',
      'QRCodeTrouble',
      'QRCodeViewFinder',
      'RecoverWithPhrase',
      'SaveRecoveryPhrase',
      'Settings',
      'ShowRecoveryPhrase',
      'Splash',
      'UnsupportedPassport',
    ]);
  });

  describe('Aesop design screen overrides', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should use regular passport screens when shouldShowAesopRedesign is false', () => {
      const navigationScreens = require('@/navigation').navigationScreens;
      expect(
        navigationScreens.PassportOnboarding.options.title,
      ).toBeUndefined();
    });

    it('should use aesop design passport screens when shouldShowAesopRedesign is true', () => {
      jest.mock('@/hooks/useAesopRedesign', () => ({
        shouldShowAesopRedesign: jest.fn().mockReturnValue(true),
      }));

      const navigationScreens = require('@/navigation').navigationScreens;
      expect(navigationScreens.PassportOnboarding.options.title).toBeDefined();
    });
  });
});
