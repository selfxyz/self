// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { renderHook } from '@testing-library/react-native';

describe('useRecoveryCircuitTestFlowEnabled', () => {
  function renderRecoveryCircuitTestFlowHook(options: {
    enableRecoveryCircuitTestFlow: boolean;
    isDevMode: boolean;
  }) {
    jest.resetModules();

    jest.doMock('@/utils/devUtils', () => ({
      IS_DEV_MODE: options.isDevMode,
    }));

    jest.doMock('@/stores/settingStore', () => ({
      useSettingStore: jest.fn((selector: any) =>
        selector({
          enableRecoveryCircuitTestFlow: options.enableRecoveryCircuitTestFlow,
        }),
      ),
    }));

    const { useRecoveryCircuitTestFlowEnabled } =
      require('@/hooks/useRecoveryCircuitTestFlowEnabled') as typeof import('@/hooks/useRecoveryCircuitTestFlowEnabled');

    return renderHook(() => useRecoveryCircuitTestFlowEnabled());
  }

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('returns true only when the persisted flag is enabled in dev mode', () => {
    const { result } = renderRecoveryCircuitTestFlowHook({
      enableRecoveryCircuitTestFlow: true,
      isDevMode: true,
    });

    expect(result.current).toBe(true);
  });

  it('returns false when the persisted flag is enabled outside dev mode', () => {
    const { result } = renderRecoveryCircuitTestFlowHook({
      enableRecoveryCircuitTestFlow: true,
      isDevMode: false,
    });

    expect(result.current).toBe(false);
  });

  it('returns false when the persisted flag is disabled', () => {
    const { result } = renderRecoveryCircuitTestFlowHook({
      enableRecoveryCircuitTestFlow: false,
      isDevMode: true,
    });

    expect(result.current).toBe(false);
  });
});
