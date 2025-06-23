//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

describe('navigation', () => {
  it('should have the correct navigation screens', () => {
    const navigationScreens = require('../../src/navigation').navigationScreens;
    const listOfScreens = Object.keys(navigationScreens).sort();
    expect(listOfScreens).toEqual([
      'AccountRecovery',
      'AccountRecoveryChoice',
      'AccountVerifiedSuccess',
      'CloudBackupSettings',
      'ConfirmBelongingScreen',
      'CreateMock',
      'DevHapticFeedback',
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
      const navigationScreens =
        require('../../src/navigation').navigationScreens;
      expect(
        navigationScreens.PassportOnboarding.options.title,
      ).toBeUndefined();
    });

    it('should use aesop design passport screens when shouldShowAesopRedesign is true', () => {
      jest.mock('../../src/hooks/useAesopRedesign', () => ({
        shouldShowAesopRedesign: jest.fn().mockReturnValue(true),
      }));

      const navigationScreens =
        require('../../src/navigation').navigationScreens;
      expect(navigationScreens.PassportOnboarding.options.title).toBeDefined();
    });
  });
});
