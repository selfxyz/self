// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { ENTRY_ROUTE_PATHS, getEntryRedirectPath } from './entryRoute';

describe('entryRoute utils', () => {
  it('matches both root entry paths used by browser and native webview launches', () => {
    expect(ENTRY_ROUTE_PATHS).toEqual(['/', '/index.html']);
  });

  it('redirects SDK launches with a verification id into the tunnel flow', () => {
    expect(getEntryRedirectPath('?verificationId=verification-123')).toBe('/tunnel/tour/1');
  });

  it('stays on the home entry path when no verification id is present', () => {
    expect(getEntryRedirectPath('')).toBeUndefined();
    expect(getEntryRedirectPath('?userId=user-123')).toBeUndefined();
  });
});
