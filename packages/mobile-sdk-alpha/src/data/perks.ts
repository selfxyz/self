// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type PerkId = 'google_usdt_faucet' | 'aave_boosted_rewards' | 'ps_human';

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
  // TODO(perks): set redeemUrl once the Google USDT faucet redemption page is public.
  google_usdt_faucet: { id: 'google_usdt_faucet', label: 'Google USDT faucet' },
  aave_boosted_rewards: { id: 'aave_boosted_rewards', label: 'Aave Boosted Rewards' },
  ps_human: { id: 'ps_human', label: 'PS Human' },
};

const ID_TYPE_TO_PERK_IDS: Record<string, PerkId[]> = {
  p: ['google_usdt_faucet', 'aave_boosted_rewards', 'ps_human'],
  i: ['google_usdt_faucet', 'aave_boosted_rewards', 'ps_human'],
  a: ['google_usdt_faucet', 'aave_boosted_rewards', 'ps_human'],
};

export function getPerkRecordsForIdType(idType: string): PerkRecord[] {
  const ids = ID_TYPE_TO_PERK_IDS[idType] ?? [];
  return ids.map(id => PERKS[id]).filter((perk): perk is PerkRecord => perk !== undefined);
}
