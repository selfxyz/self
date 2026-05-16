// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useVerificationGateStore } from '@/stores/verificationGateStore';

describe('useVerificationGateStore', () => {
  beforeEach(() => {
    useVerificationGateStore.setState({
      isOpen: false,
      reason: null,
      entryPoint: null,
      requesterName: null,
    });
  });

  it('opens with provided payload', () => {
    useVerificationGateStore.getState().open({
      reason: 'google_usat_high_security_required',
      entryPoint: 'qr_scan',
      requesterName: 'Google USAT Faucet',
    });
    expect(useVerificationGateStore.getState()).toMatchObject({
      isOpen: true,
      reason: 'google_usat_high_security_required',
      entryPoint: 'qr_scan',
      requesterName: 'Google USAT Faucet',
    });
  });

  it('closes and resets payload', () => {
    useVerificationGateStore.getState().open({
      reason: 'google_usat_high_security_required',
      entryPoint: 'deeplink',
      requesterName: 'Google USAT Faucet',
    });
    useVerificationGateStore.getState().close();
    expect(useVerificationGateStore.getState()).toMatchObject({
      isOpen: false,
      reason: null,
      entryPoint: null,
      requesterName: null,
    });
  });
});
