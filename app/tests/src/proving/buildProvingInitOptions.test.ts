// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Propagation glue test. If this regresses, the SDK flag can be correct
// and the SDK tests green while the feature is never actually turned on
// from the app. See specs/app-dev-recovery-circuit-test-flow.md (Phase 2).

jest.mock('@/stores/settingStore', () => ({
  useSettingStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/utils/devUtils', () => ({
  IS_DEV_MODE: true,
}));

import { buildProvingInitOptions } from '@/proving/buildProvingInitOptions';

const MockUseSettingStore = jest.requireMock('@/stores/settingStore')
  .useSettingStore as { getState: jest.Mock };
const MockDevUtils = jest.requireMock('@/utils/devUtils') as {
  IS_DEV_MODE: boolean;
};

describe('buildProvingInitOptions', () => {
  beforeEach(() => {
    MockDevUtils.IS_DEV_MODE = true;
    MockUseSettingStore.getState.mockReset();
  });

  it('sets forceRegisterOnAlreadyRegistered=true when dev mode and toggle are both on', () => {
    MockDevUtils.IS_DEV_MODE = true;
    MockUseSettingStore.getState.mockReturnValue({
      enableRecoveryCircuitTestFlow: true,
    });

    expect(buildProvingInitOptions()).toEqual({
      forceRegisterOnAlreadyRegistered: true,
    });
  });

  it('returns false when the toggle is off even in dev mode', () => {
    MockDevUtils.IS_DEV_MODE = true;
    MockUseSettingStore.getState.mockReturnValue({
      enableRecoveryCircuitTestFlow: false,
    });

    expect(buildProvingInitOptions()).toEqual({
      forceRegisterOnAlreadyRegistered: false,
    });
  });

  it('returns false in non-dev builds even when the toggle is on', () => {
    MockDevUtils.IS_DEV_MODE = false;
    MockUseSettingStore.getState.mockReturnValue({
      enableRecoveryCircuitTestFlow: true,
    });

    expect(buildProvingInitOptions()).toEqual({
      forceRegisterOnAlreadyRegistered: false,
    });
  });

  it('returns false when the toggle value is undefined', () => {
    MockDevUtils.IS_DEV_MODE = true;
    MockUseSettingStore.getState.mockReturnValue({});

    expect(buildProvingInitOptions()).toEqual({
      forceRegisterOnAlreadyRegistered: false,
    });
  });
});
