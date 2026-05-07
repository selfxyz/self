// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';

import GoogleLogo from '@selfxyz/mobile-sdk-alpha/svgs/icons/google.svg';

import type { EligiblePerksItem } from '../../components/data-display/EligiblePerksCard';
import { getPerkRecordsForIdType, type PerkId, PERKS as SHARED_PERKS } from '../../data/perks';

export type Perk = EligiblePerksItem;

const PERK_LOGOS: Partial<Record<PerkId, () => React.ReactNode>> = {
  google_cloud_faucet: () => <GoogleLogo />,
};

export const PERKS: Record<string, Perk> = Object.fromEntries(
  Object.values(SHARED_PERKS).map(perk => [
    perk.id,
    {
      id: perk.id,
      label: perk.label,
      ...(perk.isNew ? { isNew: true } : {}),
      ...(PERK_LOGOS[perk.id] ? { renderLogo: PERK_LOGOS[perk.id] } : {}),
    },
  ]),
);

/** Returns ready-to-render perks (label + logo + isNew) for a given ID type. */
export function getEligiblePerksForIdType(idType: string): EligiblePerksItem[] {
  return getPerksForIdType(idType);
}

export function getPerkRailLabel(perks: Perk[]): string {
  return perks.length === 1 ? 'Eligible for 1 perk' : `Eligible for ${perks.length} perks`;
}

export function getPerksForIdType(idType: string): Perk[] {
  return getPerkRecordsForIdType(idType)
    .map(perk => PERKS[perk.id])
    .filter((perk): perk is Perk => Boolean(perk?.renderLogo));
}
