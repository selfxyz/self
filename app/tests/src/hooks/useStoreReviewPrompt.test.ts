// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import {
  STORE_REVIEW_PROMPT_DELAY_MS,
  useStoreReviewPrompt,
} from '@/hooks/useStoreReviewPrompt';
import { requestStoreReviewIfEligible } from '@/services/storeReview';
import { useStoreReviewStore } from '@/stores/storeReviewStore';

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
}));
jest.mock('@/navigation', () => ({
  navigationRef: global.mockNavigationRef,
}));
jest.mock('@/services/storeReview', () => ({
  requestStoreReviewIfEligible: jest.fn(),
}));

const mockRequest = requestStoreReviewIfEligible as jest.Mock;
const selfClientStub = { trackEvent: jest.fn() };

describe('useStoreReviewPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useSelfClient as jest.Mock).mockReturnValue(selfClientStub);
    mockRequest.mockResolvedValue({ requested: true });
    global.mockNavigationRef.getCurrentRoute.mockReturnValue({ name: 'Home' });
    (AppState as unknown as { currentState: string }).currentState = 'active';
    useStoreReviewStore.setState({ promptArmed: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing while no prompt is armed', () => {
    renderHook(() => useStoreReviewPrompt());
    act(() => {
      jest.advanceTimersByTime(STORE_REVIEW_PROMPT_DELAY_MS);
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('requests a review once Home has settled and disarms the prompt', () => {
    useStoreReviewStore.setState({ promptArmed: true });
    renderHook(() => useStoreReviewPrompt());

    expect(mockRequest).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(STORE_REVIEW_PROMPT_DELAY_MS);
    });

    expect(mockRequest).toHaveBeenCalledWith(selfClientStub);
    expect(useStoreReviewStore.getState().promptArmed).toBe(false);
  });

  it('stays armed when another route sits on top of Home', () => {
    useStoreReviewStore.setState({ promptArmed: true });
    global.mockNavigationRef.getCurrentRoute.mockReturnValue({ name: 'Modal' });
    renderHook(() => useStoreReviewPrompt());

    act(() => {
      jest.advanceTimersByTime(STORE_REVIEW_PROMPT_DELAY_MS);
    });

    expect(mockRequest).not.toHaveBeenCalled();
    expect(useStoreReviewStore.getState().promptArmed).toBe(true);
  });

  it('stays armed when the app is not in the foreground', () => {
    useStoreReviewStore.setState({ promptArmed: true });
    (AppState as unknown as { currentState: string }).currentState =
      'background';
    renderHook(() => useStoreReviewPrompt());

    act(() => {
      jest.advanceTimersByTime(STORE_REVIEW_PROMPT_DELAY_MS);
    });

    expect(mockRequest).not.toHaveBeenCalled();
    expect(useStoreReviewStore.getState().promptArmed).toBe(true);
  });
});
