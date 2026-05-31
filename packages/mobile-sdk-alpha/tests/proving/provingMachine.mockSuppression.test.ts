// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PassportData } from '@selfxyz/common';
import { genMockIdDoc } from '@selfxyz/common/utils';

import {
  _getCurrentOnboardingAttempt,
  _resetOnboardingFunnelForTests,
  completeOnboardingAttempt,
  failOnboardingAttempt,
  markCurrentAttemptAsMock,
  trackOnboardingRetry,
  trackOnboardingStep,
} from '../../src/analytics/onboardingFunnel';
import { OnboardingEvents } from '../../src/constants/analytics';
import * as documentUtils from '../../src/documents/utils';
import { useProvingStore } from '../../src/proving/provingMachine';
import type { SelfClient } from '../../src/types/public';
import { actorMock } from './actorMock';

vi.mock('xstate', async () => {
  const actual = await vi.importActual<typeof import('xstate')>('xstate');
  return {
    ...actual,
    createActor: vi.fn(() => actorMock),
  };
});

vi.mock('../../src/documents/utils', async () => {
  const actual = await vi.importActual<typeof import('../../src/documents/utils')>('../../src/documents/utils');
  return {
    ...actual,
    loadSelectedDocument: vi.fn(),
    storePassportData: vi.fn(),
    clearPassportData: vi.fn(),
    reStorePassportDataWithRightCSCA: vi.fn(),
    markCurrentDocumentAsRegistered: vi.fn(),
  };
});

function makeClient() {
  return { trackEvent: vi.fn() };
}

function makeSelfClient(): SelfClient {
  return {
    trackEvent: vi.fn(),
    logProofEvent: vi.fn(),
    emit: vi.fn(),
    getPrivateKey: vi.fn().mockResolvedValue('123456789'),
    getProvingState: () => useProvingStore.getState(),
    getSelfAppState: () => ({ selfApp: null }),
  } as unknown as SelfClient;
}

beforeEach(() => {
  _resetOnboardingFunnelForTests();
  vi.clearAllMocks();
});

describe('funnel helper — mock suppression (ANA-14)', () => {
  it('markCurrentAttemptAsMock bootstraps a mock attempt without emitting STARTED', () => {
    const client = makeClient();

    markCurrentAttemptAsMock(client);

    expect(client.trackEvent).not.toHaveBeenCalled();
    const attempt = _getCurrentOnboardingAttempt();
    expect(attempt).not.toBeNull();
    expect(attempt?.isMock).toBe(true);
    expect(attempt?.firedSteps.has(OnboardingEvents.STARTED)).toBe(true);
  });

  it('marks an existing real attempt as mock without firing further events', () => {
    const client = makeClient();

    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
    expect(client.trackEvent).toHaveBeenCalledTimes(2); // STARTED + COUNTRY_SELECTED

    client.trackEvent.mockClear();
    markCurrentAttemptAsMock(client);

    expect(client.trackEvent).not.toHaveBeenCalled();
    expect(_getCurrentOnboardingAttempt()?.isMock).toBe(true);
  });

  it('suppresses trackOnboardingStep emissions on a mock attempt', () => {
    const client = makeClient();
    markCurrentAttemptAsMock(client);

    trackOnboardingStep(client, OnboardingEvents.PROOF_STARTED);
    trackOnboardingStep(client, OnboardingEvents.PROOF_SUCCEEDED);

    expect(client.trackEvent).not.toHaveBeenCalled();
  });

  it('suppresses completeOnboardingAttempt on a mock attempt and clears the attempt', () => {
    const client = makeClient();
    markCurrentAttemptAsMock(client);

    completeOnboardingAttempt(client);

    expect(client.trackEvent).not.toHaveBeenCalled();
    expect(_getCurrentOnboardingAttempt()).toBeNull();
  });

  it('suppresses failOnboardingAttempt on a mock attempt and clears the attempt', () => {
    const client = makeClient();
    markCurrentAttemptAsMock(client);

    failOnboardingAttempt(client, 'proof_generation_started', 'circuit_error');

    expect(client.trackEvent).not.toHaveBeenCalled();
    expect(_getCurrentOnboardingAttempt()).toBeNull();
  });

  it('suppresses trackOnboardingRetry on a mock attempt while still incrementing the counter', () => {
    const client = makeClient();
    markCurrentAttemptAsMock(client);

    trackOnboardingRetry(client, 'scan_started', 'nfc_failed');
    trackOnboardingRetry(client, 'scan_started', 'nfc_failed');

    expect(client.trackEvent).not.toHaveBeenCalled();
    expect(_getCurrentOnboardingAttempt()?.retryCounts.scan_started).toBe(2);
  });

  it('does not suppress emissions on a real attempt (positive control)', () => {
    const client = makeClient();

    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
    completeOnboardingAttempt(client);

    const eventNames = client.trackEvent.mock.calls.map(call => call[0]);
    expect(eventNames).toContain(OnboardingEvents.STARTED);
    expect(eventNames).toContain(OnboardingEvents.COUNTRY_SELECTED);
    expect(eventNames).toContain(OnboardingEvents.ENDED);
  });
});

describe('proving machine — mock suppression (ANA-14)', () => {
  const loadSelectedDocumentMock = vi.mocked(documentUtils.loadSelectedDocument);

  it('init() with mock=true sets isMock on the store and emits no Mixpanel events', async () => {
    const passportData = genMockIdDoc({ idType: 'mock_passport' }) as PassportData;
    expect(passportData.mock).toBe(true);

    const selfClient = makeSelfClient();
    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    await useProvingStore.getState().init(selfClient, 'register');

    expect(useProvingStore.getState().isMock).toBe(true);
    expect(selfClient.trackEvent).not.toHaveBeenCalled();
  });

  it('init() with mock=false leaves isMock false on the proving store', async () => {
    const realPassport = {
      ...(genMockIdDoc({ idType: 'mock_passport' }) as PassportData),
      mock: false,
    } as PassportData;

    const selfClient = makeSelfClient();
    loadSelectedDocumentMock.mockResolvedValue({ data: realPassport } as any);

    await useProvingStore.getState().init(selfClient, 'register');

    expect(useProvingStore.getState().isMock).toBe(false);
  });
});
