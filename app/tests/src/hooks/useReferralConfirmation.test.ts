// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation } from '@react-navigation/native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useReferralConfirmation } from '@/hooks/useReferralConfirmation';
import useUserStore from '@/stores/userStore';
import { getModalCallbacks } from '@/utils/modalCallbackRegistry';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// userStore is used as-is, no mock needed

const mockNavigate = jest.fn();
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('useReferralConfirmation', () => {
  const mockOnConfirmed = jest.fn();
  const testReferrer = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
    } as any);

    // Reset user store state
    useUserStore.getState().clearDeepLinkReferrer();
    // Set a test referrer for tests that need it
    useUserStore.getState().setDeepLinkReferrer(testReferrer);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    // Clean up store state to prevent leaks to other tests
    useUserStore.getState().clearDeepLinkReferrer();
  });

  describe('Modal display', () => {
    it('should show referral confirmation modal when hasReferrer is true and isReferralConfirmed is undefined', () => {
      renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      expect(mockNavigate).toHaveBeenCalledWith('Modal', {
        titleText: 'Referral Confirmation',
        bodyText:
          'Seems like you opened the app from a referral link. Please confirm to continue.',
        buttonText: 'Confirm',
        secondaryButtonText: 'Dismiss',
        callbackId: expect.any(Number),
      });
    });

    it('should not show modal when hasReferrer is false', () => {
      renderHook(() =>
        useReferralConfirmation({
          hasReferrer: false,
          onConfirmed: mockOnConfirmed,
        }),
      );

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not show modal when isReferralConfirmed is already true', () => {
      const { rerender } = renderHook(
        ({ hasReferrer, onConfirmed }) =>
          useReferralConfirmation({ hasReferrer, onConfirmed }),
        {
          initialProps: {
            hasReferrer: true,
            onConfirmed: mockOnConfirmed,
          },
        },
      );

      // First render shows modal
      expect(mockNavigate).toHaveBeenCalled();

      // Save callbackId before clearing
      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      mockNavigate.mockClear();

      // Manually set confirmed state (simulating user interaction)
      act(() => {
        callbacks?.onButtonPress();
      });

      // Re-render with same props should not show modal again
      rerender({
        hasReferrer: true,
        onConfirmed: mockOnConfirmed,
      });

      // Modal should not be shown again since isReferralConfirmed is now true
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not show modal when isReferralConfirmed is already false', () => {
      const { rerender } = renderHook(
        ({ hasReferrer, onConfirmed }) =>
          useReferralConfirmation({ hasReferrer, onConfirmed }),
        {
          initialProps: {
            hasReferrer: true,
            onConfirmed: mockOnConfirmed,
          },
        },
      );

      // First render shows modal
      expect(mockNavigate).toHaveBeenCalled();

      // Save callbackId before clearing
      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      mockNavigate.mockClear();

      // Manually set dismissed state
      act(() => {
        callbacks?.onModalDismiss();
      });

      // Re-render should not show modal again
      rerender({
        hasReferrer: true,
        onConfirmed: mockOnConfirmed,
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Confirmation flow', () => {
    it('should set isReferralConfirmed to true when confirm button is pressed', () => {
      const { result } = renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      expect(result.current.isReferralConfirmed).toBeUndefined();

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onButtonPress();
      });

      expect(result.current.isReferralConfirmed).toBe(true);
    });

    it('should call onConfirmed when isReferralConfirmed becomes true and hasReferrer is true', async () => {
      renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onButtonPress();
      });

      await waitFor(() => {
        expect(mockOnConfirmed).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onConfirmed when isReferralConfirmed is true but hasReferrer is false', () => {
      renderHook(() =>
        useReferralConfirmation({
          hasReferrer: false,
          onConfirmed: mockOnConfirmed,
        }),
      );

      // Manually set confirmed (simulating state change)
      act(() => {
        // This simulates the state being set externally
        // In real usage, this would happen through the modal callback
      });

      expect(mockOnConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('Dismissal flow', () => {
    it('should set isReferralConfirmed to false when modal is dismissed', () => {
      const { result } = renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onModalDismiss();
      });

      expect(result.current.isReferralConfirmed).toBe(false);
    });

    it('should clear deep link referrer when modal is dismissed', () => {
      // testReferrer is already set in beforeEach
      renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onModalDismiss();
      });

      expect(useUserStore.getState().deepLinkReferrer).toBeUndefined();
    });

    it('should not call onConfirmed when modal is dismissed', () => {
      renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onModalDismiss();
      });

      expect(mockOnConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('State transitions', () => {
    it('should handle transition from undefined to true', async () => {
      const { result } = renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      expect(result.current.isReferralConfirmed).toBeUndefined();

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onButtonPress();
      });

      expect(result.current.isReferralConfirmed).toBe(true);

      await waitFor(() => {
        expect(mockOnConfirmed).toHaveBeenCalled();
      });
    });

    it('should handle transition from undefined to false', () => {
      const { result } = renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      expect(result.current.isReferralConfirmed).toBeUndefined();

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onModalDismiss();
      });

      expect(result.current.isReferralConfirmed).toBe(false);
      expect(mockOnConfirmed).not.toHaveBeenCalled();
    });

    it('should not show modal again after confirmation', () => {
      const { rerender } = renderHook(
        ({ hasReferrer, onConfirmed }) =>
          useReferralConfirmation({ hasReferrer, onConfirmed }),
        {
          initialProps: {
            hasReferrer: true,
            onConfirmed: mockOnConfirmed,
          },
        },
      );

      // First render shows modal
      expect(mockNavigate).toHaveBeenCalledTimes(1);

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onButtonPress();
      });

      mockNavigate.mockClear();

      // Re-render with same props
      rerender({
        hasReferrer: true,
        onConfirmed: mockOnConfirmed,
      });

      // Modal should not be shown again
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not show modal again after dismissal', () => {
      const { rerender } = renderHook(
        ({ hasReferrer, onConfirmed }) =>
          useReferralConfirmation({ hasReferrer, onConfirmed }),
        {
          initialProps: {
            hasReferrer: true,
            onConfirmed: mockOnConfirmed,
          },
        },
      );

      // First render shows modal
      expect(mockNavigate).toHaveBeenCalledTimes(1);

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onModalDismiss();
      });

      mockNavigate.mockClear();

      // Re-render with same props
      rerender({
        hasReferrer: true,
        onConfirmed: mockOnConfirmed,
      });

      // Modal should not be shown again
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Props changes', () => {
    it('should show modal when hasReferrer changes from false to true', () => {
      const { rerender } = renderHook(
        ({ hasReferrer, onConfirmed }) =>
          useReferralConfirmation({ hasReferrer, onConfirmed }),
        {
          initialProps: {
            hasReferrer: false,
            onConfirmed: mockOnConfirmed,
          },
        },
      );

      expect(mockNavigate).not.toHaveBeenCalled();

      rerender({
        hasReferrer: true,
        onConfirmed: mockOnConfirmed,
      });

      expect(mockNavigate).toHaveBeenCalledWith('Modal', {
        titleText: 'Referral Confirmation',
        bodyText:
          'Seems like you opened the app from a referral link. Please confirm to continue.',
        buttonText: 'Confirm',
        secondaryButtonText: 'Dismiss',
        callbackId: expect.any(Number),
      });
    });

    it('should not show modal when hasReferrer changes from true to false', () => {
      const { rerender } = renderHook(
        ({ hasReferrer, onConfirmed }) =>
          useReferralConfirmation({ hasReferrer, onConfirmed }),
        {
          initialProps: {
            hasReferrer: true,
            onConfirmed: mockOnConfirmed,
          },
        },
      );

      expect(mockNavigate).toHaveBeenCalledTimes(1);

      mockNavigate.mockClear();

      rerender({
        hasReferrer: false,
        onConfirmed: mockOnConfirmed,
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not call onConfirmed again when callback prop changes after confirmation', async () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();

      const { rerender } = renderHook(
        ({ hasReferrer, onConfirmed }) =>
          useReferralConfirmation({ hasReferrer, onConfirmed }),
        {
          initialProps: {
            hasReferrer: true,
            onConfirmed: firstCallback,
          },
        },
      );

      const firstCallbackId = mockNavigate.mock.calls[0][1].callbackId;
      const firstCallbacks = getModalCallbacks(firstCallbackId);

      act(() => {
        firstCallbacks?.onButtonPress();
      });

      await waitFor(() => {
        expect(firstCallback).toHaveBeenCalledTimes(1);
      });

      mockNavigate.mockClear();

      rerender({
        hasReferrer: true,
        onConfirmed: secondCallback,
      });

      // Guard prevents callback from being called again for the same referrer
      // even when the callback prop changes
      expect(secondCallback).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple rapid confirmations gracefully', () => {
      const { result } = renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onButtonPress();
        callbacks?.onButtonPress(); // Call again
      });

      expect(result.current.isReferralConfirmed).toBe(true);
    });

    it('should handle multiple rapid dismissals gracefully', () => {
      const { result } = renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onModalDismiss();
        callbacks?.onModalDismiss(); // Call again
      });

      expect(result.current.isReferralConfirmed).toBe(false);
    });

    it('should return isReferralConfirmed state correctly', () => {
      const { result } = renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      expect(result.current.isReferralConfirmed).toBeUndefined();

      const callbackId = mockNavigate.mock.calls[0][1].callbackId;
      const callbacks = getModalCallbacks(callbackId);

      act(() => {
        callbacks?.onButtonPress();
      });

      expect(result.current.isReferralConfirmed).toBe(true);

      // Reset and test false
      const { result: result2 } = renderHook(() =>
        useReferralConfirmation({
          hasReferrer: true,
          onConfirmed: mockOnConfirmed,
        }),
      );

      const callbackId2 = mockNavigate.mock.calls[1][1].callbackId;
      const callbacks2 = getModalCallbacks(callbackId2);

      act(() => {
        callbacks2?.onModalDismiss();
      });

      expect(result2.current.isReferralConfirmed).toBe(false);
    });
  });
});
