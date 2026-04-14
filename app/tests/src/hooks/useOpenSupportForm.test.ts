// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import { supportFormUrl } from '@/consts/links';
import useOpenSupportForm from '@/hooks/useOpenSupportForm';
import { impactLight } from '@/integrations/haptics';
import { navigationRef } from '@/navigation';

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
  });

  it('triggers haptic feedback and navigates to the support form WebView', () => {
    const { result } = renderHook(() => useOpenSupportForm());

    act(() => {
      result.current();
    });

    expect(impactLight).toHaveBeenCalledTimes(1);
    expect(navigationRef.navigate).toHaveBeenCalledWith('WebView', {
      url: supportFormUrl,
      title: 'Get Support',
    });
  });
});
