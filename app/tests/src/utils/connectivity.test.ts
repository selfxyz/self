// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { getConnectivityBannerState } from '@/utils/connectivity';

describe('getConnectivityBannerState', () => {
  it('returns offline when the device is disconnected', () => {
    expect(
      getConnectivityBannerState({
        isConnected: false,
        isInternetReachable: true,
        type: 'wifi',
        details: null,
      }),
    ).toBe('offline');
  });

  it('returns offline when the internet is unreachable', () => {
    expect(
      getConnectivityBannerState({
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
        details: null,
      }),
    ).toBe('offline');
  });

  it('returns weak on slower cellular generations', () => {
    expect(
      getConnectivityBannerState({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: { cellularGeneration: '3g' },
      } as never),
    ).toBe('weak');
  });

  it('returns online on healthy connections', () => {
    expect(
      getConnectivityBannerState({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: null,
      }),
    ).toBe('online');
  });
});
