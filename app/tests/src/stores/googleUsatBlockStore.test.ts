// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useGoogleUsatBlockStore } from '@/stores/googleUsatBlockStore';

describe('useGoogleUsatBlockStore', () => {
  beforeEach(() => {
    useGoogleUsatBlockStore.setState({ isOpen: false, entryPoint: null });
  });

  it('opens with provided entry point', () => {
    useGoogleUsatBlockStore.getState().open('qr_scan');
    expect(useGoogleUsatBlockStore.getState()).toMatchObject({
      isOpen: true,
      entryPoint: 'qr_scan',
    });
  });

  it('closes and resets entry point', () => {
    useGoogleUsatBlockStore.getState().open('deeplink');
    useGoogleUsatBlockStore.getState().close();
    expect(useGoogleUsatBlockStore.getState()).toMatchObject({
      isOpen: false,
      entryPoint: null,
    });
  });
});
