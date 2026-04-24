// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import { supportFormUrl } from '@/consts/links';
import useOpenSupportForm from '@/hooks/useOpenSupportForm';
import { impactLight } from '@/integrations/haptics';
import { navigationRef } from '@/navigation';
import { useSettingStore } from '@/stores/settingStore';

jest.mock('@/integrations/haptics', () => ({
  impactLight: jest.fn(),
}));

jest.mock('@/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(),
    navigate: jest.fn(),
  },
}));

describe('useOpenSupportForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (navigationRef.isReady as jest.Mock).mockReturnValue(true);
    useSettingStore.setState({
      supportUuidEnabled: false,
      supportUuid: null,
    });
  });

  it('navigates to the support form WebView with haptic feedback', () => {
    const { result } = renderHook(() => useOpenSupportForm());

    act(() => {
      result.current();
    });

    expect(impactLight).toHaveBeenCalledTimes(1);
    expect(navigationRef.navigate).toHaveBeenCalledWith(
      'WebView',
      expect.objectContaining({
        title: 'Get Support',
      }),
    );

    const [, params] = (navigationRef.navigate as jest.Mock).mock.calls[0];
    expect(params.url).toContain(supportFormUrl);
  });

  it('omits support_uuid when support ID sharing is disabled (default)', () => {
    const { result } = renderHook(() => useOpenSupportForm());

    act(() => {
      result.current();
    });

    const [, params] = (navigationRef.navigate as jest.Mock).mock.calls[0];
    expect(params.url).not.toContain('support_uuid=');
  });

  it('appends support_uuid when the user has enabled sharing', () => {
    useSettingStore.setState({
      supportUuidEnabled: true,
      supportUuid: '11111111-1111-1111-1111-111111111111',
    });

    const { result } = renderHook(() => useOpenSupportForm());

    act(() => {
      result.current();
    });

    const [, params] = (navigationRef.navigate as jest.Mock).mock.calls[0];
    expect(params.url).toContain(
      'support_uuid=11111111-1111-1111-1111-111111111111',
    );
  });
});
