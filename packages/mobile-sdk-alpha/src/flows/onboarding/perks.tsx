// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Canonical mapping of ID type → eligible perks. The data layer is the seam
// that survives a future migration to remote-config or a perks API: callers
// stay on `getPerksForIdType` and the rail render stays put.

import type React from 'react';

import GoogleLogo from '../../../svgs/icons/google.svg';

export interface Perk {
  id: string;
  label: string;
  renderLogo: () => React.ReactNode;
}

export const PERKS: Record<string, Perk> = {
  google_usdt_faucet: {
    id: 'google_usdt_faucet',
    label: 'Google USDT faucet',
    renderLogo: () => <GoogleLogo width={24} height={24} />,
  },
};

const ID_TYPE_TO_PERK_IDS: Record<string, string[]> = {
  p: ['google_usdt_faucet'],
  i: ['google_usdt_faucet'],
  a: ['google_usdt_faucet'],
};

export function getPerksForIdType(idType: string): Perk[] {
  const perkIds = ID_TYPE_TO_PERK_IDS[idType] ?? [];
  return perkIds.map(id => PERKS[id]).filter((p): p is Perk => p !== undefined);
}
