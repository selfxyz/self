// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { act } from '@testing-library/react-native';

import { useSettingStore } from '../../../src/stores/settingStore';
import { getPostVerificationRoute } from '../../../src/utils/proving/provingMachine';

describe('getPostVerificationRoute', () => {
  afterEach(() => {
    act(() => {
      useSettingStore.setState({
        cloudBackupEnabled: false,
        hasViewedRecoveryPhrase: false,
      });
    });
  });

  it('returns SaveRecoveryPhrase when no backup and phrase not viewed', () => {
    act(() => {
      useSettingStore.setState({
        cloudBackupEnabled: false,
        hasViewedRecoveryPhrase: false,
      });
    });
    expect(getPostVerificationRoute()).toBe('SaveRecoveryPhrase');
  });

  it('returns AccountVerifiedSuccess when cloud backup enabled', () => {
    act(() => {
      useSettingStore.setState({ cloudBackupEnabled: true });
    });
    expect(getPostVerificationRoute()).toBe('AccountVerifiedSuccess');
  });

  it('returns AccountVerifiedSuccess when phrase already viewed', () => {
    act(() => {
      useSettingStore.setState({ hasViewedRecoveryPhrase: true });
    });
    expect(getPostVerificationRoute()).toBe('AccountVerifiedSuccess');
  });
});
