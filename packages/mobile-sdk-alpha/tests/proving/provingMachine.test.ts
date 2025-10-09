// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PassportData } from '@selfxyz/common/types';

import type { SelfClient } from '../../src';
import { SdkEvents } from '../../src';
import * as documentsUtils from '../../src/documents/utils';
import { useProvingStore } from '../../src/proving/provingMachine';

import { act, renderHook } from '@testing-library/react';

describe('provingMachine registration completion', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes proving machine for confirmed registration - no document found', async () => {
    const loadSelectedDocumentSpy = vi.spyOn(documentsUtils, 'loadSelectedDocument').mockResolvedValue(null);

    const hasAnyValidRegisteredDocumentSpy = vi
      .spyOn(documentsUtils, 'hasAnyValidRegisteredDocument')
      .mockResolvedValue(true);

    const { result: initHook } = renderHook(() => useProvingStore(state => state.init));
    const emitMock = vi.fn();
    const selfClient = {
      trackEvent: vi.fn(),
      emit: emitMock,
      getSelfAppState: () => ({}),
      getProvingState: () => ({}),
    } as unknown as SelfClient;

    expect(initHook.current).toBeDefined();

    await act(async () => {
      await initHook.current(selfClient, 'register');
    });

    const { result: provingStoreHook } = renderHook(() => useProvingStore(state => state.currentState));

    expect(provingStoreHook.current).toBe('passport_data_not_found');
    expect(emitMock).toHaveBeenCalledWith(SdkEvents.PROVING_PASSPORT_DATA_NOT_FOUND);
    expect(loadSelectedDocumentSpy).toHaveBeenCalled();
    expect(hasAnyValidRegisteredDocumentSpy).not.toHaveBeenCalled();
  });
});

describe('events', () => {
  vi.spyOn(documentsUtils, 'loadSelectedDocument').mockResolvedValue(null);

  vi.spyOn(documentsUtils, 'hasAnyValidRegisteredDocument').mockResolvedValue(true);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('emits PROVING_MACHINE_PASSPORT_NOT_SUPPORTED', async () => {
    const emitMock = vi.fn();
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

    expect(emitMock).toHaveBeenCalledWith(SdkEvents.PROVING_PASSPORT_NOT_SUPPORTED, {
      countryCode: 'test',
      documentCategory: 'passport',
    });
  });

  it('emits PROVING_MACHINE_PASSPORT_NOT_SUPPORTED with no passport data', async () => {
    const emitMock = vi.fn();
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

    expect(emitMock).toHaveBeenCalledWith(SdkEvents.PROVING_PASSPORT_NOT_SUPPORTED, {
      countryCode: null,
      documentCategory: null,
    });
  });

  it('emits PROVING_MACHINE_ACCOUNT_RECOVERY_CHOICE', async () => {
    const emitMock = vi.fn();
    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.getState()._handleAccountRecoveryChoice(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(SdkEvents.PROVING_ACCOUNT_RECOVERY_REQUIRED);
  });

  it('emits PROVING_MACHINE_ACCOUNT_VERIFIED_SUCCESS', async () => {
    const emitMock = vi.fn();
    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.getState()._handleAccountVerifiedSuccess(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(SdkEvents.PROVING_ACCOUNT_VERIFIED_SUCCESS);
  });

  it('emits PROVING_MACHINE_PASSPORT_DATA_NOT_FOUND', async () => {
    const emitMock = vi.fn();
    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.getState()._handlePassportDataNotFound(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(SdkEvents.PROVING_PASSPORT_DATA_NOT_FOUND);
  });

  it('emits PROVING_MACHINE_REGISTER_ERROR_OR_FAILURE with a valid document', async () => {
    const hasAnyValidRegisteredDocumentSpy = vi
      .spyOn(documentsUtils, 'hasAnyValidRegisteredDocument')
      .mockResolvedValue(true);

    const emitMock = vi.fn();
    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.getState()._handleRegisterErrorOrFailure(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(SdkEvents.PROVING_REGISTER_ERROR_OR_FAILURE, {
      hasValidDocument: true,
    });

    expect(hasAnyValidRegisteredDocumentSpy).toHaveBeenCalled();
  });

  it('emits PROVING_MACHINE_REGISTER_ERROR_OR_FAILURE with a no valid document', async () => {
    const hasAnyValidRegisteredDocumentSpy = vi
      .spyOn(documentsUtils, 'hasAnyValidRegisteredDocument')
      .mockResolvedValue(false);

    const emitMock = vi.fn();
    const selfClient = {
      emit: emitMock,
    } as unknown as SelfClient;

    await act(async () => {
      useProvingStore.getState()._handleRegisterErrorOrFailure(selfClient);
    });

    expect(emitMock).toHaveBeenCalledWith(SdkEvents.PROVING_REGISTER_ERROR_OR_FAILURE, {
      hasValidDocument: false,
    });

    expect(hasAnyValidRegisteredDocumentSpy).toHaveBeenCalled();
  });
});
