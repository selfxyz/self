// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { PrivacyMask } from '../../src/observability/PrivacyMask';

import { cleanup, render } from '@testing-library/react';

afterEach(cleanup);

describe('PrivacyMask', () => {
  it('wraps children in the Session Replay sentry-mask class', () => {
    const { getByText } = render(
      <PrivacyMask>
        <span>secret</span>
      </PrivacyMask>,
    );

    const wrapper = getByText('secret').parentElement;
    expect(wrapper?.classList.contains('sentry-mask')).toBe(true);
  });

  it('merges a caller-provided className while keeping sentry-mask', () => {
    const { getByText } = render(
      <PrivacyMask className="custom">
        <span>secret</span>
      </PrivacyMask>,
    );

    const wrapper = getByText('secret').parentElement;
    expect(wrapper?.classList.contains('sentry-mask')).toBe(true);
    expect(wrapper?.classList.contains('custom')).toBe(true);
  });
});
