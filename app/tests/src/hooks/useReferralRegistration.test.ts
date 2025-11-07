// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useRoute } from '@react-navigation/native';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useReferralRegistration } from '@/hooks/useReferralRegistration';
import { useRegisterReferral } from '@/hooks/useRegisterReferral';
import useUserStore from '@/stores/userStore';

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  })),
}));

jest.mock('@/hooks/useRegisterReferral');
jest.mock('@/stores/userStore');

const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseRegisterReferral = useRegisterReferral as jest.MockedFunction<
  typeof useRegisterReferral
>;
const mockUseUserStore = useUserStore as jest.MockedFunction<
  typeof useUserStore
>;

describe('useReferralRegistration', () => {
  const validReferrer = '0x1234567890123456789012345678901234567890';
  const mockRegisterReferral = jest.fn();
  const mockIsReferrerRegistered = jest.fn();
  const mockMarkReferrerAsRegistered = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRoute.mockReturnValue({
      params: {},
    } as any);

    mockUseRegisterReferral.mockReturnValue({
      registerReferral: mockRegisterReferral,
      isLoading: false,
      error: null,
    });

    const mockStore = {
      isReferrerRegistered: mockIsReferrerRegistered,
      markReferrerAsRegistered: mockMarkReferrerAsRegistered,
    };

    mockUseUserStore.getState = jest.fn(() => mockStore as any);

    mockRegisterReferral.mockResolvedValue({ success: true });
    mockIsReferrerRegistered.mockReturnValue(false);
  });

  it('should not register if no referrer in params', () => {
    mockUseRoute.mockReturnValue({
      params: {},
    } as any);

    renderHook(() => useReferralRegistration());

    expect(mockRegisterReferral).not.toHaveBeenCalled();
  });

  it('should correctly extract referrer from route params', () => {
    const referrer = '0x1234567890123456789012345678901234567890';
    mockUseRoute.mockReturnValue({
      params: { referrer },
    } as any);

    renderHook(() => useReferralRegistration());

    expect(mockIsReferrerRegistered).toHaveBeenCalledWith(referrer);
  });

  it('should register referral when referrer is present and not registered', async () => {
    mockUseRoute.mockReturnValue({
      params: { referrer: validReferrer },
    } as any);

    renderHook(() => useReferralRegistration());

    await waitFor(() => {
      expect(mockIsReferrerRegistered).toHaveBeenCalledWith(validReferrer);
      expect(mockRegisterReferral).toHaveBeenCalledWith(validReferrer);
    });

    await waitFor(() => {
      expect(mockMarkReferrerAsRegistered).toHaveBeenCalledWith(validReferrer);
    });
  });

  it('should not register if referrer is already registered', async () => {
    mockUseRoute.mockReturnValue({
      params: { referrer: validReferrer },
    } as any);

    mockIsReferrerRegistered.mockReturnValue(true);

    renderHook(() => useReferralRegistration());

    await waitFor(() => {
      expect(mockIsReferrerRegistered).toHaveBeenCalledWith(validReferrer);
    });

    expect(mockRegisterReferral).not.toHaveBeenCalled();
    expect(mockMarkReferrerAsRegistered).not.toHaveBeenCalled();
  });

  it('should not register if registration is in progress', async () => {
    mockUseRoute.mockReturnValue({
      params: { referrer: validReferrer },
    } as any);

    mockUseRegisterReferral.mockReturnValue({
      registerReferral: mockRegisterReferral,
      isLoading: true,
      error: null,
    });

    renderHook(() => useReferralRegistration());

    // Wait a bit to ensure useEffect has run
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockRegisterReferral).not.toHaveBeenCalled();
  });

  it('should not mark as registered if registration fails', async () => {
    mockUseRoute.mockReturnValue({
      params: { referrer: validReferrer },
    } as any);

    mockRegisterReferral.mockResolvedValue({
      success: false,
      error: 'Registration failed',
    });

    renderHook(() => useReferralRegistration());

    await waitFor(() => {
      expect(mockRegisterReferral).toHaveBeenCalledWith(validReferrer);
    });

    expect(mockMarkReferrerAsRegistered).not.toHaveBeenCalled();
  });

  it('should handle case-insensitive referrer addresses', async () => {
    const upperCaseReferrer = validReferrer.toUpperCase();
    mockUseRoute.mockReturnValue({
      params: { referrer: upperCaseReferrer },
    } as any);

    renderHook(() => useReferralRegistration());

    await waitFor(() => {
      expect(mockIsReferrerRegistered).toHaveBeenCalledWith(upperCaseReferrer);
      expect(mockRegisterReferral).toHaveBeenCalledWith(upperCaseReferrer);
    });
  });

  it('should handle other params alongside referrer', async () => {
    mockUseRoute.mockReturnValue({
      params: { referrer: validReferrer, points: 24 },
    } as any);

    renderHook(() => useReferralRegistration());

    await waitFor(() => {
      expect(mockRegisterReferral).toHaveBeenCalledWith(validReferrer);
    });

    // Verify points param doesn't interfere with referrer extraction
    expect(mockIsReferrerRegistered).toHaveBeenCalledWith(validReferrer);
  });

  it('should extract referrer correctly when points is also present', async () => {
    mockUseRoute.mockReturnValue({
      params: { points: 24, referrer: validReferrer },
    } as any);

    renderHook(() => useReferralRegistration());

    await waitFor(() => {
      expect(mockIsReferrerRegistered).toHaveBeenCalledWith(validReferrer);
      expect(mockRegisterReferral).toHaveBeenCalledWith(validReferrer);
    });
  });
});
