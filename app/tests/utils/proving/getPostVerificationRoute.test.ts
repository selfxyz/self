// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11
import { useSettingStore } from '../../../src/stores/settingStore';
import { getPostVerificationRoute } from '../../../src/utils/proving/provingMachine';

describe('getPostVerificationRoute', () => {
  afterEach(() => {
    useSettingStore.setState({ cloudBackupEnabled: false });
  });

  it('returns SaveRecoveryPhrase when cloud backup disabled', () => {
    useSettingStore.setState({ cloudBackupEnabled: false });
    expect(getPostVerificationRoute()).toBe('SaveRecoveryPhrase');
  });

  it('returns AccountVerifiedSuccess when cloud backup enabled', () => {
    useSettingStore.setState({ cloudBackupEnabled: true });
    expect(getPostVerificationRoute()).toBe('AccountVerifiedSuccess');
  });
});
