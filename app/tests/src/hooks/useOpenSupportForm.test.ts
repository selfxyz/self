// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';

import { supportFormUrl } from '@/consts/links';
import useOpenSupportForm from '@/hooks/useOpenSupportForm';
import { impactLight } from '@/integrations/haptics';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/integrations/haptics', () => ({
  impactLight: jest.fn(),
  impactMedium: jest.fn(),
  selectionChange: jest.fn(),
}));

describe('useOpenSupportForm', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  it('navigates to the support form in the in-app WebView', () => {
    const { result } = renderHook(() => useOpenSupportForm());

    act(() => {
      result.current();
    });

    expect(impactLight).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('WebView', {
      url: supportFormUrl,
      title: 'Get Support',
    });
  });
});
