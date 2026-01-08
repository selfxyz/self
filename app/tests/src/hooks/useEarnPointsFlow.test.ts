// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { useEarnPointsFlow } from '@/hooks/useEarnPointsFlow';
import { useRegisterReferral } from '@/hooks/useRegisterReferral';
import {
  hasUserAnIdentityDocumentRegistered,
  hasUserDoneThePointsDisclosure,
  POINT_VALUES,
  pointsSelfApp,
} from '@/services/points';
import useUserStore from '@/stores/userStore';
import { getModalCallbacks } from '@/utils/modalCallbackRegistry';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
}));

jest.mock('@/hooks/useRegisterReferral', () => ({
  useRegisterReferral: jest.fn(),
}));

jest.mock('@/services/points', () => ({
  hasUserAnIdentityDocumentRegistered: jest.fn(),
  hasUserDoneThePointsDisclosure: jest.fn(),
  pointsSelfApp: jest.fn(),
  POINT_VALUES: {
    referee: 24,
  },
}));

// userStore is used as-is, no mock needed

const mockNavigate = jest.fn();
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseSelfClient = useSelfClient as jest.MockedFunction<
  typeof useSelfClient
>;
const mockUseRegisterReferral = useRegisterReferral as jest.MockedFunction<
  typeof useRegisterReferral
>;
const mockHasUserAnIdentityDocumentRegistered =
  hasUserAnIdentityDocumentRegistered as jest.MockedFunction<
    typeof hasUserAnIdentityDocumentRegistered
  >;
const mockHasUserDoneThePointsDisclosure =
  hasUserDoneThePointsDisclosure as jest.MockedFunction<
    typeof hasUserDoneThePointsDisclosure
  >;
const mockPointsSelfApp = pointsSelfApp as jest.MockedFunction<
  typeof pointsSelfApp
>;

describe('useEarnPointsFlow', () => {
  const mockSetSelfApp = jest.fn();
  const mockSelfClient = {
    getSelfAppState: jest.fn(() => ({
      setSelfApp: mockSetSelfApp,
    })),
  };
  const mockRegisterReferral = jest.fn();
  const mockSelfApp = {
    appName: '✨ Self Points',
    endpoint: '0x829d183faaa675f8f80e8bb25fb1476cd4f7c1f0',
    sessionId: 'test-session-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetSelfApp.mockClear();
    jest.useFakeTimers();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as any);

    mockUseSelfClient.mockReturnValue(mockSelfClient as any);

    mockUseRegisterReferral.mockReturnValue({
      registerReferral: mockRegisterReferral,
      isLoading: false,
      error: null,
    });

    // Reset user store state
    useUserStore.getState().clearDeepLinkReferrer();
    useUserStore.getState().registeredReferrers.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Identity verification flow', () => {
    it('should show identity verification modal when user has no identity document', async () => {
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: false,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      expect(mockHasUserAnIdentityDocumentRegistered).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Modal', {
        titleText: 'Identity Verification Required',
        bodyText:
          'To access Self Points, you need to register an identity document with Self first. This helps us verify your identity and keep your points secure.',
        buttonText: 'Verify Identity',
        secondaryButtonText: 'Not Now',
        callbackId: expect.any(Number),
      });
    });

    it('should navigate to CountryPicker when identity verification modal button is pressed', async () => {
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: false,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      expect(callbacks).toBeDefined();

      act(() => {
        callbacks!.onButtonPress();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockNavigate).toHaveBeenCalledWith('CountryPicker');
    });

    it('should clear referrer when identity verification modal is dismissed with referrer', async () => {
      const referrer = '0x1234567890123456789012345678901234567890';
      useUserStore.getState().setDeepLinkReferrer(referrer);
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks!.onModalDismiss();
      });

      expect(useUserStore.getState().deepLinkReferrer).toBeUndefined();
    });
  });

  describe('Points disclosure flow', () => {
    it('should show points disclosure modal when user has not done disclosure', async () => {
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(true);
      mockHasUserDoneThePointsDisclosure.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: false,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      expect(mockHasUserAnIdentityDocumentRegistered).toHaveBeenCalled();
      expect(mockHasUserDoneThePointsDisclosure).toHaveBeenCalled();

      expect(mockNavigate).toHaveBeenCalledWith('PointsInfo', {
        showNextButton: true,
        onNextButtonPress: expect.any(Function),
      });

      // We pass onNextButtonPress() that displays the points disclosure modal
      await act(async () => {
        await mockNavigate.mock.calls[0][1].onNextButtonPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('Modal', {
        titleText: 'Points Disclosure Required',
        bodyText:
          'To access Self Points, you need to complete the points disclosure first. This helps us verify your identity and keep your points secure.',
        buttonText: 'Complete Points Disclosure',
        secondaryButtonText: 'Not Now',
        callbackId: expect.any(Number),
      });
    });

    it('should navigate to Prove screen when points disclosure modal button is pressed', async () => {
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(true);
      mockHasUserDoneThePointsDisclosure.mockResolvedValue(false);
      mockPointsSelfApp.mockResolvedValue(mockSelfApp as any);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: false,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('PointsInfo', {
        showNextButton: true,
        onNextButtonPress: expect.any(Function),
      });

      await act(async () => {
        await mockNavigate.mock.calls[0][1].onNextButtonPress();
      });

      const callbackId = mockNavigate.mock.calls[1][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      expect(callbacks).toBeDefined();

      await act(async () => {
        await callbacks!.onButtonPress();
      });

      expect(mockPointsSelfApp).toHaveBeenCalled();

      // setSelfApp is called synchronously after pointsSelfApp resolves
      expect(mockSetSelfApp).toHaveBeenCalledWith(mockSelfApp);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockNavigate).toHaveBeenCalledWith('ProvingScreenRouter');
    });

    it('should clear referrer when points disclosure modal is dismissed with referrer', async () => {
      const referrer = '0x1234567890123456789012345678901234567890';
      useUserStore.getState().setDeepLinkReferrer(referrer);
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(true);
      mockHasUserDoneThePointsDisclosure.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('PointsInfo', {
        showNextButton: true,
        onNextButtonPress: expect.any(Function),
      });

      await act(async () => {
        await mockNavigate.mock.calls[0][1].onNextButtonPress();
      });

      const callbackId = mockNavigate.mock.calls[1][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks!.onModalDismiss();
      });

      expect(useUserStore.getState().deepLinkReferrer).toBeUndefined();
    });
  });

  describe('Direct navigation flow', () => {
    it('should navigate to Points screen when user has completed all checks and no referrer', async () => {
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(true);
      mockHasUserDoneThePointsDisclosure.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: false,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('Points');
    });

    it('should not navigate when user has completed all checks, has referrer, but skipReferralFlow is true', async () => {
      const referrer = '0x1234567890123456789012345678901234567890';
      useUserStore.getState().setDeepLinkReferrer(referrer);
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(true);
      mockHasUserDoneThePointsDisclosure.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: true,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress(true);
      });

      // Should not navigate to Points or Gratification
      expect(mockNavigate).not.toHaveBeenCalledWith('Points');
      expect(mockNavigate).not.toHaveBeenCalledWith('Gratification');
    });
  });

  describe('Referral flow', () => {
    const referrer = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      useUserStore.getState().setDeepLinkReferrer(referrer);
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(true);
      mockHasUserDoneThePointsDisclosure.mockResolvedValue(true);
    });

    it('should handle referral flow when referrer is confirmed and not skipped', async () => {
      mockRegisterReferral.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: true,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress(false);
      });

      expect(mockRegisterReferral).toHaveBeenCalledWith(referrer);
      expect(useUserStore.getState().isReferrerRegistered(referrer)).toBe(true);
      expect(useUserStore.getState().deepLinkReferrer).toBeUndefined();
      expect(mockNavigate).toHaveBeenCalledWith('Gratification', {
        points: POINT_VALUES.referee,
      });
    });

    it('should not register referral if already registered', async () => {
      useUserStore.getState().markReferrerAsRegistered(referrer);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: true,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress(false);
      });

      expect(mockRegisterReferral).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Gratification', {
        points: POINT_VALUES.referee,
      });
    });

    it('should show error modal and preserve referrer if referral registration fails', async () => {
      mockRegisterReferral.mockResolvedValue({
        success: false,
        error: 'Network error occurred',
      });

      const originalConsoleError = console.error;
      console.error = jest.fn();

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: true,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress(false);
      });

      expect(mockRegisterReferral).toHaveBeenCalledWith(referrer);

      // Should NOT navigate to Gratification on failure
      expect(mockNavigate).not.toHaveBeenCalledWith('Gratification', {
        points: POINT_VALUES.referee,
      });

      // Should show error modal instead
      expect(mockNavigate).toHaveBeenCalledWith('Modal', {
        titleText: 'Referral Registration Failed',
        bodyText: expect.stringContaining('Network error occurred'),
        buttonText: 'Try Again',
        secondaryButtonText: 'Dismiss',
        callbackId: expect.any(Number),
      });

      // Should preserve the referrer for retry
      expect(useUserStore.getState().deepLinkReferrer).toBe(referrer);

      // Should log the error
      expect(console.error).toHaveBeenCalledWith(
        'Referral registration failed:',
        'Network error occurred',
      );

      console.error = originalConsoleError;
    });

    it('should retry referral registration when error modal retry button is pressed', async () => {
      // First call fails, second call succeeds
      mockRegisterReferral
        .mockResolvedValueOnce({
          success: false,
          error: 'Network error',
        })
        .mockResolvedValueOnce({
          success: true,
        });

      const originalConsoleError = console.error;
      console.error = jest.fn();

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: true,
        }),
      );

      // First attempt - should fail
      await act(async () => {
        await result.current.onEarnPointsPress(false);
      });

      expect(mockRegisterReferral).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('Modal', {
        titleText: 'Referral Registration Failed',
        bodyText: expect.stringContaining('Network error'),
        buttonText: 'Try Again',
        secondaryButtonText: 'Dismiss',
        callbackId: expect.any(Number),
      });

      // Referrer should still be in store
      expect(useUserStore.getState().deepLinkReferrer).toBe(referrer);

      // Get the callback from the error modal and trigger retry
      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      mockNavigate.mockClear();

      // Retry - should succeed
      await act(async () => {
        await callbacks!.onButtonPress();
      });

      expect(mockRegisterReferral).toHaveBeenCalledTimes(2);
      expect(mockRegisterReferral).toHaveBeenCalledWith(referrer);

      // Should now navigate to Gratification
      expect(mockNavigate).toHaveBeenCalledWith('Gratification', {
        points: POINT_VALUES.referee,
      });

      // Should mark referrer as registered and clear it
      expect(useUserStore.getState().isReferrerRegistered(referrer)).toBe(true);
      expect(useUserStore.getState().deepLinkReferrer).toBeUndefined();

      console.error = originalConsoleError;
    });

    it('should clear referrer when error modal is dismissed', async () => {
      mockRegisterReferral.mockResolvedValue({
        success: false,
        error: 'API error',
      });

      const originalConsoleError = console.error;
      console.error = jest.fn();

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: true,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress(false);
      });

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      // Dismiss the error modal
      act(() => {
        callbacks!.onModalDismiss();
      });

      // Referrer should be cleared to prevent retry loop
      expect(useUserStore.getState().deepLinkReferrer).toBeUndefined();

      console.error = originalConsoleError;
    });

    it('should not handle referral flow when isReferralConfirmed is false', async () => {
      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: false,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress(false);
      });

      expect(mockRegisterReferral).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('Gratification');
    });

    it('should not handle referral flow when isReferralConfirmed is undefined', async () => {
      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress(false);
      });

      expect(mockRegisterReferral).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('Gratification');
    });

    it('should not handle referral flow when hasReferrer is false', async () => {
      useUserStore.getState().clearDeepLinkReferrer();

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: false,
          isReferralConfirmed: true,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress(false);
      });

      expect(mockRegisterReferral).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('Gratification');
    });

    it('should handle referral flow when referrer is not in store but hasReferrer is true', async () => {
      useUserStore.getState().clearDeepLinkReferrer();
      mockRegisterReferral.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: true,
          isReferralConfirmed: true,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress(false);
      });

      // Should not call registerReferral if referrer is not in store
      expect(mockRegisterReferral).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('Gratification');
    });
  });

  describe('Edge cases', () => {
    it('should handle errors in hasUserAnIdentityDocumentRegistered gracefully', async () => {
      // Mock to return false on error (as the actual function catches errors and returns false)
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: false,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      // The function catches errors and returns false, so it should show identity verification modal
      expect(mockNavigate).toHaveBeenCalledWith(
        'Modal',
        expect.objectContaining({
          titleText: 'Identity Verification Required',
          callbackId: expect.any(Number),
        }),
      );
    });

    it('should handle errors in hasUserDoneThePointsDisclosure gracefully', async () => {
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(true);
      // Mock to return false on error (as the actual function catches errors and returns false)
      mockHasUserDoneThePointsDisclosure.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: false,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('PointsInfo', {
        showNextButton: true,
        onNextButtonPress: expect.any(Function),
      });

      await act(async () => {
        await mockNavigate.mock.calls[0][1].onNextButtonPress();
      });

      // The function catches errors and returns false, so it should show points disclosure modal
      expect(mockNavigate).toHaveBeenCalledWith(
        'Modal',
        expect.objectContaining({
          titleText: 'Points Disclosure Required',
          callbackId: expect.any(Number),
        }),
      );
    });

    it('should call pointsSelfApp when navigating to points proof', async () => {
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(true);
      mockHasUserDoneThePointsDisclosure.mockResolvedValue(false);
      mockPointsSelfApp.mockResolvedValue(mockSelfApp as any);

      const { result } = renderHook(() =>
        useEarnPointsFlow({
          hasReferrer: false,
          isReferralConfirmed: undefined,
        }),
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('PointsInfo', {
        showNextButton: true,
        onNextButtonPress: expect.any(Function),
      });

      await act(async () => {
        await mockNavigate.mock.calls[0][1].onNextButtonPress();
      });

      const callbackId = mockNavigate.mock.calls[1][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      await act(async () => {
        await callbacks!.onButtonPress();
      });

      // Verify pointsSelfApp was called
      expect(mockPointsSelfApp).toHaveBeenCalled();

      // setSelfApp should be called when pointsSelfApp succeeds
      expect(mockSetSelfApp).toHaveBeenCalledWith(mockSelfApp);
    });
  });

  describe('Callback dependencies', () => {
    it('should update callbacks when dependencies change', async () => {
      mockHasUserAnIdentityDocumentRegistered.mockResolvedValue(true);
      mockHasUserDoneThePointsDisclosure.mockResolvedValue(true);

      const referrer = '0x1234567890123456789012345678901234567890';
      useUserStore.getState().setDeepLinkReferrer(referrer);
      mockRegisterReferral.mockResolvedValue({ success: true });

      const { result, rerender } = renderHook(
        ({ hasReferrer, isReferralConfirmed }) =>
          useEarnPointsFlow({ hasReferrer, isReferralConfirmed }),
        {
          initialProps: {
            hasReferrer: false,
            isReferralConfirmed: undefined,
          },
        },
      );

      await act(async () => {
        await result.current.onEarnPointsPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('Points');

      mockNavigate.mockClear();

      rerender({
        hasReferrer: true,
        isReferralConfirmed: true,
      });

      await act(async () => {
        await result.current.onEarnPointsPress(false);
      });

      expect(mockRegisterReferral).toHaveBeenCalledWith(referrer);
    });
  });
});
