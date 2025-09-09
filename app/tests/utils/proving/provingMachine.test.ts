// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import { PassportData } from '@selfxyz/common/types';
import { SdkEvents, type SelfClient } from '@selfxyz/mobile-sdk-alpha';

import { useProvingStore } from '@/utils/proving/provingMachine';

jest.mock('@/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => {
  const actual = jest.requireActual('@selfxyz/mobile-sdk-alpha');

  return {
    ...actual,
    loadSelectedDocument: jest.fn().mockResolvedValue(null),
    hasAnyValidRegisteredDocument: jest.fn().mockResolvedValue(true),
  };
});

describe('provingMachine registration completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes proving machine for confirmed registration - no document found', async () => {
    const { result: initHook } = renderHook(() =>
      useProvingStore(state => state.init),
    );
    const emitMock = jest.fn();

    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    expect(initHook.current).toBeDefined();

    await act(async () => {
      await initHook.current(selfClient, 'register');
    });

    const { result: provingStoreHook } = renderHook(() =>
      useProvingStore(state => state.currentState),
    );

    expect(provingStoreHook.current).toBe('passport_data_not_found');
    expect(emitMock).toHaveBeenCalledWith(
      SdkEvents.PROVING_PASSPORT_DATA_NOT_FOUND,
    );
  });
});

describe('events', () => {
  it('emits PROVING_MACHINE_PASSPORT_NOT_SUPPORTED', async () => {
    const emitMock = jest.fn();
    const mockPassportData = {
      mrz: 'mrz',
      dsc: 'dsc',
      eContent: [1, 2, 3],
      signedAttr: [1, 2, 3],
      encryptedDigest: [1, 2, 3],
      passportMetadata: {
        countryCode: 'test',
      },
      documentCategory: 'passport',
    } as PassportData;

    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.setState({ passportData: mockPassportData });
      useProvingStore.getState()._handlePassportNotSupported(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(
      SdkEvents.PROVING_PASSPORT_NOT_SUPPORTED,
      {
        countryCode: 'test',
        documentCategory: 'passport',
      },
    );
  });

  it('emits PROVING_MACHINE_PASSPORT_NOT_SUPPORTED with no passport data', async () => {
    const emitMock = jest.fn();
    const mockPassportData = {
      passportMetadata: {},
    } as PassportData;

    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.setState({ passportData: mockPassportData });
      useProvingStore.getState()._handlePassportNotSupported(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(
      SdkEvents.PROVING_PASSPORT_NOT_SUPPORTED,
      {
        countryCode: null,
        documentCategory: null,
      },
    );
  });

  it('emits PROVING_MACHINE_ACCOUNT_RECOVERY_CHOICE', async () => {
    const emitMock = jest.fn();
    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.getState()._handleAccountRecoveryChoice(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(
      SdkEvents.PROVING_ACCOUNT_RECOVERY_REQUIRED,
    );
  });

  it('emits PROVING_MACHINE_ACCOUNT_VERIFIED_SUCCESS', async () => {
    const emitMock = jest.fn();
    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.getState()._handleAccountVerifiedSuccess(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(
      SdkEvents.PROVING_ACCOUNT_VERIFIED_SUCCESS,
    );
  });

  it('emits PROVING_MACHINE_PASSPORT_DATA_NOT_FOUND', async () => {
    const emitMock = jest.fn();
    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.getState()._handlePassportDataNotFound(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(
      SdkEvents.PROVING_PASSPORT_DATA_NOT_FOUND,
    );
  });

  it('emits PROVING_MACHINE_REGISTER_ERROR_OR_FAILURE', async () => {
    const emitMock = jest.fn();
    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.getState()._handleRegisterErrorOrFailure(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(
      SdkEvents.PROVING_REGISTER_ERROR_OR_FAILURE,
      {
        hasValidDocument: true,
      },
    );
  });
});
