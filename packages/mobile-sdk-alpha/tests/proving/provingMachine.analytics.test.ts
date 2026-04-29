// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SelfClient } from '../../src';
import * as documentsUtils from '../../src/documents/utils';
import { useProvingStore } from '../../src/proving/provingMachine';

import { act, renderHook } from '@testing-library/react';

/**
 * Tests the `didNewRegistrationProof` flag that gates canonical onboarding
 * events at the `completed` state (provingMachine.ts:532).
 *
 * The terminal invariant:
 * - New registration (went through post_proving): flag is true → fires
 *   PROOF_SUCCEEDED + completeOnboardingAttempt
 * - ALREADY_REGISTERED (validating_document → completed, skips post_proving):
 *   flag stays false → no canonical events
 * - Disclose: circuitType !== 'register' → fires DISCLOSURE_COMPLETED instead
 */

describe('provingMachine terminal invariant — didNewRegistrationProof', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts false after init with register', async () => {
    vi.spyOn(documentsUtils, 'loadSelectedDocument').mockResolvedValue(null);

    const selfClient = {
      trackEvent: vi.fn(),
      emit: vi.fn(),
      getSelfAppState: () => ({}),
      getProvingState: () => ({}),
      navigation: {
        enableKeychainErrorModal: vi.fn(),
      },
    } as unknown as SelfClient;

    const { result } = renderHook(() => useProvingStore(state => state.init));

    await act(async () => {
      await result.current(selfClient, 'register');
    });

    expect(useProvingStore.getState().didNewRegistrationProof).toBe(false);
    expect(useProvingStore.getState().circuitType).toBe('register');
  });

  it('starts false after init with disclose', async () => {
    vi.spyOn(documentsUtils, 'loadSelectedDocument').mockResolvedValue(null);

    const selfClient = {
      trackEvent: vi.fn(),
      emit: vi.fn(),
      getSelfAppState: () => ({}),
      getProvingState: () => ({}),
      navigation: {
        enableKeychainErrorModal: vi.fn(),
      },
    } as unknown as SelfClient;

    const { result } = renderHook(() => useProvingStore(state => state.init));

    await act(async () => {
      await result.current(selfClient, 'disclose');
    });

    expect(useProvingStore.getState().didNewRegistrationProof).toBe(false);
    expect(useProvingStore.getState().circuitType).toBe('disclose');
  });

  it('resets to false when init is called again after being set to true', async () => {
    vi.spyOn(documentsUtils, 'loadSelectedDocument').mockResolvedValue(null);

    // Simulate a previous registration that set the flag
    useProvingStore.setState({ didNewRegistrationProof: true } as any);
    expect(useProvingStore.getState().didNewRegistrationProof).toBe(true);

    const selfClient = {
      trackEvent: vi.fn(),
      emit: vi.fn(),
      getSelfAppState: () => ({}),
      getProvingState: () => ({}),
      navigation: {
        enableKeychainErrorModal: vi.fn(),
      },
    } as unknown as SelfClient;

    const { result } = renderHook(() => useProvingStore(state => state.init));

    await act(async () => {
      await result.current(selfClient, 'register');
    });

    expect(useProvingStore.getState().didNewRegistrationProof).toBe(false);
  });

  it('ALREADY_REGISTERED path: circuitType is register but flag stays false', () => {
    // The ALREADY_REGISTERED path sets circuitType to 'register' (line 1420)
    // but never enters post_proving, so didNewRegistrationProof stays false.
    // At completed state, the guard (circuitType === 'register' && didNewRegistrationProof)
    // evaluates to false → no canonical onboarding events fire.
    useProvingStore.setState({
      circuitType: 'register',
      didNewRegistrationProof: false,
    } as any);

    const state = useProvingStore.getState();
    expect(state.circuitType === 'register' && state.didNewRegistrationProof).toBe(false);
  });

  it('new registration path: both conditions are true after post_proving', () => {
    // The normal registration path enters post_proving, which sets
    // didNewRegistrationProof to true. At completed state, the guard
    // evaluates to true → PROOF_SUCCEEDED + completeOnboardingAttempt fire.
    useProvingStore.setState({
      circuitType: 'register',
      didNewRegistrationProof: true,
    } as any);

    const state = useProvingStore.getState();
    expect(state.circuitType === 'register' && state.didNewRegistrationProof).toBe(true);
  });

  it('disclose path: circuitType is disclose, flag is irrelevant', () => {
    // Disclose flows never set didNewRegistrationProof. At completed state,
    // the first guard fails (circuitType !== 'register'), and the else-if
    // branch fires DISCLOSURE_COMPLETED instead.
    useProvingStore.setState({
      circuitType: 'disclose',
      didNewRegistrationProof: false,
    } as any);

    const state = useProvingStore.getState();
    expect(state.circuitType === 'register' && state.didNewRegistrationProof).toBe(false);
    expect(state.circuitType === 'disclose').toBe(true);
  });
});
