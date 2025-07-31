// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/**
 * Format a user identifier for display.
 *
 * Hex addresses are truncated to keep the UI compact while
 * UUIDs (and other string values) are shown in full.
 */
export function formatUserId(
  userId: string | null | undefined,
  userIdType: 'hex' | 'uuid' | undefined,
): string | null {
  if (!userId) {
    return null;
  }
  if (userIdType === 'hex') {
    const address = userId.startsWith('0x') ? userId : `0x${userId}`;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
  return userId;
}
