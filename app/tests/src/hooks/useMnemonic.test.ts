// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import useMnemonic from '@/hooks/useMnemonic';
import { useAuth } from '@/providers/authProvider';

jest.mock('@/providers/authProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('ethers', () => ({
  ethers: {
    Mnemonic: {
      fromEntropy: jest.fn().mockReturnValue({ phrase: 'one two three four' }),
    },
  },
}));

const getOrCreateMnemonic = jest.fn();
(useAuth as jest.Mock).mockReturnValue({ getOrCreateMnemonic });

describe('useMnemonic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads mnemonic', async () => {
    getOrCreateMnemonic.mockResolvedValue({ data: { entropy: '0x00' } });
    const { result } = renderHook(() => useMnemonic());
    await act(async () => {
      await result.current.loadMnemonic();
    });
    expect(result.current.mnemonic).toEqual(['one', 'two', 'three', 'four']);
  });

  it('handles missing mnemonic', async () => {
    getOrCreateMnemonic.mockResolvedValue(null);
    const { result } = renderHook(() => useMnemonic());
    await act(async () => {
      await result.current.loadMnemonic();
    });
    expect(result.current.mnemonic).toBeUndefined();
  });
});
