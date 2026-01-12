// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Country3LetterCode } from '@selfxyz/common/constants';
import { countryCodes } from '@selfxyz/common/constants';
import type { SelfAppDisclosureConfig } from '@selfxyz/common/utils/appType';

function listToString(list: string[]): string {
  if (list.length === 1) {
    return list[0];
  } else if (list.length === 2) {
    return list.join(' nor ');
  }
  return `${list.slice(0, -1).join(', ')} nor ${list.at(-1)}`;
}

function countriesToSentence(countries: Country3LetterCode[]): string {
  return listToString(countries.map(country => countryCodes[country]));
}

export const ORDERED_DISCLOSURE_KEYS: Array<keyof SelfAppDisclosureConfig> = [
  'issuing_state',
  'name',
  'passport_number',
  'nationality',
  'date_of_birth',
  'gender',
  'expiry_date',
  'ofac',
  'excludedCountries',
  'minimumAge',
] as const;

export function getDisclosureItems(
  disclosures: SelfAppDisclosureConfig,
): Array<{ key: string; text: string }> {
  const items: Array<{ key: string; text: string }> = [];

  for (const key of ORDERED_DISCLOSURE_KEYS) {
    const isEnabled = disclosures[key];
    if (!isEnabled || (Array.isArray(isEnabled) && isEnabled.length === 0)) {
      continue;
    }

    const text = getDisclosureText(key, disclosures);
    if (text) {
      items.push({ key, text });
    }
  }

  return items;
}

/**
 * Generates the display text for a disclosure key.
 * This is the single source of truth for disclosure text across the app.
 */
export function getDisclosureText(
  key: keyof SelfAppDisclosureConfig,
  disclosures: SelfAppDisclosureConfig,
): string {
  switch (key) {
    case 'ofac':
      return 'I am not on the OFAC sanction list';
    case 'excludedCountries':
      return `I am not a citizen of the following countries: ${countriesToSentence(
        (disclosures.excludedCountries as Country3LetterCode[]) || [],
      )}`;
    case 'minimumAge':
      return `Age is over ${disclosures.minimumAge}`;
    case 'name':
      return 'Name';
    case 'passport_number':
      return 'Passport Number';
    case 'date_of_birth':
      return 'Date of Birth';
    case 'gender':
      return 'Gender';
    case 'expiry_date':
      return 'Passport Expiry Date';
    case 'issuing_state':
      return 'Issuing State';
    case 'nationality':
      return 'Nationality';
    default:
      return '';
  }
}
