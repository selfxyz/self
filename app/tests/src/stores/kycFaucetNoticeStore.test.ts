// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  showKycFaucetNotice,
  useKycFaucetNoticeStore,
} from '@/stores/kycFaucetNoticeStore';

describe('useKycFaucetNoticeStore', () => {
  beforeEach(() => {
    useKycFaucetNoticeStore.getState().close();
  });

  it('opens with the provided handlers', () => {
    const onContinue = jest.fn();
    const onDecline = jest.fn();
    showKycFaucetNotice({ onContinue, onDecline });

    expect(useKycFaucetNoticeStore.getState()).toMatchObject({
      isOpen: true,
      isContinuing: false,
      onContinue,
      onDecline,
    });
  });

  it('hides but keeps the handlers while continuing, then clears everything on close', () => {
    const onContinue = jest.fn();
    showKycFaucetNotice({ onContinue });
    useKycFaucetNoticeStore.getState().markContinuing();
    expect(useKycFaucetNoticeStore.getState()).toMatchObject({
      isOpen: false,
      isContinuing: true,
      onContinue,
    });

    useKycFaucetNoticeStore.getState().close();
    expect(useKycFaucetNoticeStore.getState()).toMatchObject({
      isOpen: false,
      isContinuing: false,
      onContinue: null,
      onDecline: null,
    });
  });
});
