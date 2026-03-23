// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { renderHook, waitFor } from '@testing-library/react-native';

import { usePendingKycRecovery } from '@/hooks/usePendingKycRecovery';
import { navigationRef } from '@/navigation';

// Mock dependencies
jest.mock('@/hooks/useDiditWebSocket', () => ({
  useDiditWebSocket: jest.fn(() => ({
    subscribe: jest.fn(),
    unsubscribeAll: jest.fn(),
  })),
}));

jest.mock('@/stores/pendingKycStore', () => ({
  usePendingKycStore: jest.fn(),
}));

jest.mock('@/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(),
    navigate: jest.fn(),
  },
}));

const mockNavigationRef = navigationRef as jest.Mocked<typeof navigationRef>;

describe('usePendingKycRecovery', () => {
  const mockSubscribe = jest.fn();
  const mockUnsubscribeAll = jest.fn();
  const mockRemoveExpiredVerifications = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup default mocks
    const { useDiditWebSocket } = jest.requireMock(
      '@/hooks/useDiditWebSocket',
    );
    useDiditWebSocket.mockReturnValue({
      subscribe: mockSubscribe,
      unsubscribeAll: mockUnsubscribeAll,
    });

    const { usePendingKycStore } = jest.requireMock('@/stores/pendingKycStore');
    usePendingKycStore.mockReturnValue({
      pendingVerifications: [],
      removeExpiredVerifications: mockRemoveExpiredVerifications,
    });

    mockNavigationRef.isReady.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should remove expired verifications on mount', () => {
    renderHook(() => usePendingKycRecovery());

    expect(mockRemoveExpiredVerifications).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe all on unmount', () => {
    const { unmount } = renderHook(() => usePendingKycRecovery());

    unmount();

    expect(mockUnsubscribeAll).toHaveBeenCalledTimes(1);
  });

  it('should navigate to KYCVerified when processing verification exists and navigation is ready', () => {
    const { usePendingKycStore } = jest.requireMock('@/stores/pendingKycStore');
    usePendingKycStore.mockReturnValue({
      pendingVerifications: [
        {
          sessionId: 'session-123',
          status: 'processing',
          documentId: 'doc-456',
          timeoutAt: Date.now() + 10000,
        },
      ],
      removeExpiredVerifications: mockRemoveExpiredVerifications,
    });

    mockNavigationRef.isReady.mockReturnValue(true);

    renderHook(() => usePendingKycRecovery());

    expect(mockNavigationRef.navigate).toHaveBeenCalledWith('KYCVerified', {
      documentId: 'doc-456',
    });
  });

  it('should poll for navigation readiness when not initially ready', async () => {
    const { usePendingKycStore } = jest.requireMock('@/stores/pendingKycStore');
    usePendingKycStore.mockReturnValue({
      pendingVerifications: [
        {
          sessionId: 'session-123',
          status: 'processing',
          documentId: 'doc-456',
          timeoutAt: Date.now() + 10000,
        },
      ],
      removeExpiredVerifications: mockRemoveExpiredVerifications,
    });

    // Navigation not ready initially
    mockNavigationRef.isReady.mockReturnValue(false);

    renderHook(() => usePendingKycRecovery());

    // Should not navigate immediately
    expect(mockNavigationRef.navigate).not.toHaveBeenCalled();

    // Simulate navigation becoming ready after 300ms
    jest.advanceTimersByTime(300);
    mockNavigationRef.isReady.mockReturnValue(true);

    // Advance timers to trigger polling
    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('KYCVerified', {
        documentId: 'doc-456',
      });
    });
  });

  it('should not attempt recovery for same sessionId twice', () => {
    const { usePendingKycStore } = jest.requireMock('@/stores/pendingKycStore');
    const verification = {
      sessionId: 'session-123',
      status: 'processing' as const,
      documentId: 'doc-456',
      timeoutAt: Date.now() + 10000,
    };

    usePendingKycStore.mockReturnValue({
      pendingVerifications: [verification],
      removeExpiredVerifications: mockRemoveExpiredVerifications,
    });

    mockNavigationRef.isReady.mockReturnValue(true);

    const { rerender } = renderHook(() => usePendingKycRecovery());

    expect(mockNavigationRef.navigate).toHaveBeenCalledTimes(1);

    // Rerender with same verification
    rerender();

    // Should not navigate again for same sessionId
    expect(mockNavigationRef.navigate).toHaveBeenCalledTimes(1);
  });

  it('should subscribe to pending verification when no processing verification exists', () => {
    const { usePendingKycStore } = jest.requireMock('@/stores/pendingKycStore');
    usePendingKycStore.mockReturnValue({
      pendingVerifications: [
        {
          sessionId: 'session-789',
          status: 'pending',
          timeoutAt: Date.now() + 10000,
        },
      ],
      removeExpiredVerifications: mockRemoveExpiredVerifications,
    });

    renderHook(() => usePendingKycRecovery());

    expect(mockSubscribe).toHaveBeenCalledWith('session-789');
  });

  it('should skip expired verifications', () => {
    const { usePendingKycStore } = jest.requireMock('@/stores/pendingKycStore');
    usePendingKycStore.mockReturnValue({
      pendingVerifications: [
        {
          sessionId: 'session-expired',
          status: 'pending',
          timeoutAt: Date.now() - 1000, // Expired
        },
      ],
      removeExpiredVerifications: mockRemoveExpiredVerifications,
    });

    renderHook(() => usePendingKycRecovery());

    // Should not subscribe to expired verification
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('should clean up polling interval on unmount', () => {
    const { usePendingKycStore } = jest.requireMock('@/stores/pendingKycStore');
    usePendingKycStore.mockReturnValue({
      pendingVerifications: [
        {
          sessionId: 'session-123',
          status: 'processing',
          documentId: 'doc-456',
          timeoutAt: Date.now() + 10000,
        },
      ],
      removeExpiredVerifications: mockRemoveExpiredVerifications,
    });

    mockNavigationRef.isReady.mockReturnValue(false);

    const { unmount } = renderHook(() => usePendingKycRecovery());

    // Advance timers to ensure interval is created
    jest.advanceTimersByTime(100);

    // Unmount should clear the interval
    unmount();

    // Advance timers further - navigate should not be called after unmount
    mockNavigationRef.isReady.mockReturnValue(true);
    jest.advanceTimersByTime(1000);

    expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
  });

  it('should prioritize processing verification over pending verification', () => {
    const { usePendingKycStore } = jest.requireMock('@/stores/pendingKycStore');
    usePendingKycStore.mockReturnValue({
      pendingVerifications: [
        {
          sessionId: 'session-pending',
          status: 'pending',
          timeoutAt: Date.now() + 10000,
        },
        {
          sessionId: 'session-processing',
          status: 'processing',
          documentId: 'doc-789',
          timeoutAt: Date.now() + 10000,
        },
      ],
      removeExpiredVerifications: mockRemoveExpiredVerifications,
    });

    mockNavigationRef.isReady.mockReturnValue(true);

    renderHook(() => usePendingKycRecovery());

    // Should navigate to processing verification, not subscribe to pending
    expect(mockNavigationRef.navigate).toHaveBeenCalledWith('KYCVerified', {
      documentId: 'doc-789',
    });
    expect(mockSubscribe).not.toHaveBeenCalled();
  });
});
