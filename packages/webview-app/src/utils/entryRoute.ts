// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export const ENTRY_ROUTE_PATHS = ['/', '/index.html'] as const;

export function getEntryRedirectPath(search: string): string | undefined {
  const verificationId = new URLSearchParams(search).get('verificationId');
  return verificationId ? '/tunnel/tour/1' : undefined;
}
