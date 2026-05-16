// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { trackOnboardingStep, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { OnboardingEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { useKycLauncher } from '@/hooks/useKycLauncher';
import {
  createKycSession,
  launchKycVerification as startKycVerification,
} from '@/integrations/kyc';
import { useFeedback } from '@/providers/feedbackProvider';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  __esModule: true,
  sanitizeErrorMessage: (msg: unknown) => String(msg),
  trackOnboardingStep: jest.fn(),
  useSelfClient: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  OnboardingEvents: { SCAN_STARTED: 'Onboarding: Document Scan Started' },
}));

jest.mock('@/integrations/kyc', () => ({
  createKycSession: jest.fn(),
  launchKycVerification: jest.fn(),
}));

jest.mock('@/providers/feedbackProvider', () => ({
  useFeedback: jest.fn(),
}));

const mockCreateKycSession = createKycSession as jest.MockedFunction<
  typeof createKycSession
>;
const mockStartKycVerification = startKycVerification as jest.MockedFunction<
  typeof startKycVerification
>;
const mockTrackOnboardingStep = trackOnboardingStep as jest.MockedFunction<
  typeof trackOnboardingStep
>;
const mockUseSelfClient = useSelfClient as jest.MockedFunction<
  typeof useSelfClient
>;
const mockUseFeedback = useFeedback as jest.MockedFunction<typeof useFeedback>;

describe('useKycLauncher', () => {
  const selfClientStub = { trackEvent: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelfClient.mockReturnValue(
      selfClientStub as unknown as ReturnType<typeof useSelfClient>,
    );
    mockUseFeedback.mockReturnValue({
      showModal: jest.fn(),
    } as unknown as ReturnType<typeof useFeedback>);
  });

  it('emits SCAN_STARTED after createKycSession resolves and before launch', async () => {
    const callOrder: string[] = [];
    mockCreateKycSession.mockImplementation(async () => {
      callOrder.push('createKycSession');
      return { sessionId: 'sess-1', sessionToken: 'tok-1' } as Awaited<
        ReturnType<typeof createKycSession>
      >;
    });
    mockTrackOnboardingStep.mockImplementation(((..._args: unknown[]) => {
      callOrder.push('trackOnboardingStep');
    }) as unknown as typeof trackOnboardingStep);
    mockStartKycVerification.mockImplementation(async () => {
      callOrder.push('launchKycVerification');
      return { type: 'cancelled' } as Awaited<
        ReturnType<typeof startKycVerification>
      >;
    });

    const { result } = renderHook(() =>
      useKycLauncher({ countryCode: 'US', onCancel: jest.fn() }),
    );

    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(callOrder).toEqual([
      'createKycSession',
      'trackOnboardingStep',
      'launchKycVerification',
    ]);
    expect(mockTrackOnboardingStep).toHaveBeenCalledWith(
      selfClientStub,
      OnboardingEvents.SCAN_STARTED,
      { branch: 'kyc' },
    );
  });

  it('does not emit SCAN_STARTED when createKycSession fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    mockCreateKycSession.mockRejectedValue(new Error('network down'));

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useKycLauncher({ countryCode: 'US', onError }),
    );

    await act(async () => {
      await result.current.launchKycVerification();
    });

    await waitFor(() => expect(onError).toHaveBeenCalled());

    expect(mockTrackOnboardingStep).not.toHaveBeenCalled();
    expect(mockStartKycVerification).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
