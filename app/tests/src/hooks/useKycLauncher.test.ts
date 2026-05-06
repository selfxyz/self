// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import { useKycLauncher } from '@/hooks/useKycLauncher';

const mockCreateKycSession = jest.fn();
const mockStartKycVerification = jest.fn();
const mockShowModal = jest.fn();
const mockNavigate = jest.fn();
const mockTrackOnboardingStep = jest.fn();
const mockGetKycDocumentCount = jest.fn();
const mockGetState = jest.fn();

jest.mock('@/integrations/kyc', () => ({
  createKycSession: (...args: unknown[]) => mockCreateKycSession(...args),
  launchKycVerification: (...args: unknown[]) =>
    mockStartKycVerification(...args),
}));

jest.mock('@/providers/feedbackProvider', () => ({
  useFeedback: () => ({
    showModal: mockShowModal,
  }),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  getKycDocumentCount: () => mockGetKycDocumentCount(),
}));

jest.mock('@/stores/pendingKycStore', () => ({
  usePendingKycStore: {
    getState: () => mockGetState(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  sanitizeErrorMessage: (value: string) => value,
  trackOnboardingStep: (...args: unknown[]) => mockTrackOnboardingStep(...args),
  useSelfClient: () => ({ id: 'self-client' }),
}));

describe('useKycLauncher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({ pendingVerifications: [] });
    mockGetKycDocumentCount.mockResolvedValue(0);
    mockCreateKycSession.mockResolvedValue({
      sessionId: 'session-1',
      sessionToken: 'token-1',
    });
    mockStartKycVerification.mockResolvedValue({ type: 'cancelled' });
  });

  it('calls createKycSession when no pending verification and 0 KYC IDs', async () => {
    const { result } = renderHook(() => useKycLauncher({ countryCode: 'US' }));

    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockCreateKycSession).toHaveBeenCalledTimes(1);
  });

  it('blocks launch when pending verification exists', async () => {
    mockGetState.mockReturnValue({
      pendingVerifications: [{ sessionId: '1', status: 'pending' }],
    });
    const { result } = renderHook(() => useKycLauncher({ countryCode: 'US' }));

    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockCreateKycSession).not.toHaveBeenCalled();
    expect(mockShowModal).toHaveBeenCalledWith(
      expect.objectContaining({
        titleText: 'Verification in progress',
        bodyText:
          "You already have a KYC verification being processed. We'll notify you when it's ready.",
      }),
    );
  });

  it('blocks launch when processing verification exists', async () => {
    mockGetState.mockReturnValue({
      pendingVerifications: [{ sessionId: '1', status: 'processing' }],
    });
    const { result } = renderHook(() => useKycLauncher({ countryCode: 'US' }));

    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockCreateKycSession).not.toHaveBeenCalled();
    expect(mockShowModal).toHaveBeenCalledWith(
      expect.objectContaining({
        titleText: 'Verification in progress',
        bodyText:
          "You already have a KYC verification being processed. We'll notify you when it's ready.",
      }),
    );
  });

  it('blocks launch when 3 KYC IDs exist', async () => {
    mockGetKycDocumentCount.mockResolvedValue(3);
    const { result } = renderHook(() => useKycLauncher({ countryCode: 'US' }));

    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockCreateKycSession).not.toHaveBeenCalled();
    expect(mockShowModal).toHaveBeenCalledWith(
      expect.objectContaining({
        titleText: 'Maximum verifications reached',
        bodyText:
          'You can have up to 3 verified IDs. Remove one before starting a new verification.',
      }),
    );
  });

  it('calls createKycSession when 2 KYC IDs exist and no pending', async () => {
    mockGetKycDocumentCount.mockResolvedValue(2);
    const { result } = renderHook(() => useKycLauncher({ countryCode: 'US' }));

    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockCreateKycSession).toHaveBeenCalledTimes(1);
  });

  it('shows pending modal first when pending and max IDs both exist', async () => {
    mockGetState.mockReturnValue({
      pendingVerifications: [{ sessionId: '1', status: 'pending' }],
    });
    mockGetKycDocumentCount.mockResolvedValue(3);
    const { result } = renderHook(() => useKycLauncher({ countryCode: 'US' }));

    await act(async () => {
      await result.current.launchKycVerification();
    });

    expect(mockCreateKycSession).not.toHaveBeenCalled();
    expect(mockShowModal).toHaveBeenCalledTimes(1);
    expect(mockShowModal).toHaveBeenCalledWith(
      expect.objectContaining({
        titleText: 'Verification in progress',
      }),
    );
    expect(mockShowModal).not.toHaveBeenCalledWith(
      expect.objectContaining({
        titleText: 'Maximum verifications reached',
      }),
    );
    expect(mockGetKycDocumentCount).not.toHaveBeenCalled();
  });
});
