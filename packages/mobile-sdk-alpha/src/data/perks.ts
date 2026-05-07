// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type PerkId = 'google_cloud_faucet';

export interface PerkRecord {
  id: PerkId;
  label: string;
  /** Set when the perk should display a "NEW" badge on list surfaces. */
  isNew?: boolean;
  /**
   * External URL to open when a user taps the perk to redeem it. Leave
   * undefined while a perk is still in pre-launch / coming-soon state — the
   * UI will track the tap analytics event but not navigate anywhere.
   */
  redeemUrl?: string;
}

export const PERKS: Record<PerkId, PerkRecord> = {
  google_cloud_faucet: { id: 'google_cloud_faucet', label: 'Google Cloud Faucet', isNew: true },
};

const ID_TYPE_TO_PERK_IDS: Record<string, PerkId[]> = {
  p: ['google_cloud_faucet'],
  i: ['google_cloud_faucet'],
  a: ['google_cloud_faucet'],
};

export function getPerkRecordsForIdType(idType: string): PerkRecord[] {
  const ids = ID_TYPE_TO_PERK_IDS[idType] ?? [];
  return ids.map(id => PERKS[id]).filter((perk): perk is PerkRecord => perk !== undefined);
}
