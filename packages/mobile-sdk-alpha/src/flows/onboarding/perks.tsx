// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';

import GoogleLogo from '@selfxyz/mobile-sdk-alpha/svgs/icons/google.svg';
import UsatLogo from '@selfxyz/mobile-sdk-alpha/svgs/icons/usat.svg';

import type { EligiblePerksItem } from '../../components/data-display/EligiblePerksCard';
import { getPerkRecordsForIdType, type PerkId, PERKS as SHARED_PERKS } from '../../data/perks';

export type { PerkId } from '../../data/perks';
export type Perk = EligiblePerksItem;

const PERK_LOGOS: Partial<Record<PerkId, () => React.ReactNode[]>> = {
  google_cloud_faucet: () => [<GoogleLogo key="google" />, <UsatLogo key="usat" />],
};

export const PERKS: Record<string, Perk> = Object.fromEntries(
  Object.values(SHARED_PERKS).map(perk => [
    perk.id,
    {
      id: perk.id,
      label: perk.label,
      ...(perk.isNew ? { isNew: true } : {}),
      ...(PERK_LOGOS[perk.id] ? { renderLogos: PERK_LOGOS[perk.id] } : {}),
    },
  ]),
);

/** Returns ready-to-render perks (label + logo + isNew) for a given ID type. */
export function getEligiblePerksForIdType(idType: string): EligiblePerksItem[] {
  return getPerkRecordsForIdType(idType)
    .map(perk => PERKS[perk.id])
    .filter((perk): perk is Perk => Boolean(perk));
}

export function getPerkRailLabel(perks: Perk[]): string {
  return perks.length === 1 ? 'Eligible for 1 perk' : `Eligible for ${perks.length} perks`;
}

export function getPerksForIdType(idType: string): Perk[] {
  return getPerkRecordsForIdType(idType)
    .map(perk => PERKS[perk.id])
    .filter((perk): perk is Perk => Boolean(perk?.renderLogos));
}

export interface PerkRailContent {
  perks: Perk[];
  logos: React.ReactNode[];
  label: string;
}

/**
 * Shared resolver for PerkRail inputs. Returns null when the ID type has no
 * renderable perks so callers can hide the rail. Counts *perks*, not logos —
 * one perk with multiple brand marks (e.g. Google + USAT) is still one perk.
 */
export function getPerkRailContent(idType: string): PerkRailContent | null {
  const perks = getPerksForIdType(idType);
  if (perks.length === 0) {
    return null;
  }
  const logos = perks.flatMap(perk => perk.renderLogos?.() ?? []);
  return { perks, logos, label: getPerkRailLabel(perks) };
}
