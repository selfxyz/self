// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';

import { useKycLauncher } from '@/hooks/useKycLauncher';
import { createKycSession, launchKycVerification } from '@/integrations/kyc';
import { useFeedback } from '@/providers/feedbackProvider';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/integrations/kyc', () => ({
  createKycSession: jest.fn(),
  launchKycVerification: jest.fn(),
}));

jest.mock('@/providers/feedbackProvider', () => ({
  useFeedback: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  sanitizeErrorMessage: (msg: string) => msg,
}));

const MockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const MockCreateKycSession = createKycSession as jest.MockedFunction<
  typeof createKycSession
>;
const MockLaunchKycVerification = launchKycVerification as jest.MockedFunction<
  typeof launchKycVerification
>;
const MockUseFeedback = useFeedback as jest.MockedFunction<typeof useFeedback>;

const mockNavigate = jest.fn();
const mockShowModal = jest.fn();

describe('useKycLauncher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockUseNavigation.mockReturnValue({ navigate: mockNavigate } as any);
    MockUseFeedback.mockReturnValue({ showModal: mockShowModal } as any);
    MockCreateKycSession.mockResolvedValue({
      sessionId: 'sess-1',
      sessionToken: 'tok-1',
    });
  });

  const renderLauncher = (options: { onError?: jest.Mock } = {}) =>
    renderHook(() =>
      useKycLauncher({
        countryCode: 'US',
        onError: options.onError,
      }),
    );

  it('navigates to KycSuccess when status is Approved', async () => {
    MockLaunchKycVerification.mockResolvedValue({
      type: 'completed',
      session: { status: 'Approved', sessionId: 'sess-1' },
    });

    const { result } = renderLauncher();
    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockNavigate).toHaveBeenCalledWith('KycSuccess', {
      sessionId: 'sess-1',
    });
  });

  it('navigates to KycFailure (not KycSuccess) when status is Declined', async () => {
    MockLaunchKycVerification.mockResolvedValue({
      type: 'completed',
      session: { status: 'Declined', sessionId: 'sess-1' },
    });

    const { result } = renderLauncher();
    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith(
      'KycSuccess',
      expect.anything(),
    );
    expect(mockNavigate).toHaveBeenCalledWith('KycFailure', {
      countryCode: 'US',
      canRetry: true,
    });
  });

  it('navigates to KycFailure when status is In Review', async () => {
    MockLaunchKycVerification.mockResolvedValue({
      type: 'completed',
      session: { status: 'In Review', sessionId: 'sess-1' },
    });

    const { result } = renderLauncher();
    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockNavigate).toHaveBeenCalledWith('KycFailure', {
      countryCode: 'US',
      canRetry: true,
    });
  });

  it('navigates to KycFailure when session is missing', async () => {
    MockLaunchKycVerification.mockResolvedValue({ type: 'completed' });

    const { result } = renderLauncher();
    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockNavigate).toHaveBeenCalledWith('KycFailure', {
      countryCode: 'US',
      canRetry: true,
    });
  });

  it('forwards Declined to a custom onError when provided', async () => {
    MockLaunchKycVerification.mockResolvedValue({
      type: 'completed',
      session: { status: 'Declined', sessionId: 'sess-1' },
    });
    const onError = jest.fn();

    const { result } = renderLauncher({ onError });
    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('routes type:failed to KycFailure', async () => {
    MockLaunchKycVerification.mockResolvedValue({
      type: 'failed',
      error: { type: 'provider_error', message: 'oops' },
    });

    const { result } = renderLauncher();
    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockNavigate).toHaveBeenCalledWith('KycFailure', {
      countryCode: 'US',
      canRetry: true,
    });
  });
});
