// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Country3LetterCode } from '@selfxyz/common/constants';
import { countryCodes } from '@selfxyz/common/constants';
import type { SelfAppDisclosureConfig } from '@selfxyz/common/utils/appType';

function listToString(list: string[]): string {
  if (list.length === 1) return list[0];
  if (list.length === 2) return list.join(' nor ');
  return `${list.slice(0, -1).join(', ')} nor ${list.at(-1)}`;
}

function countriesToSentence(countries: Country3LetterCode[]): string {
  return listToString(countries.map(country => countryCodes[country]));
}

export function getDisclosureItems(
  disclosures: SelfAppDisclosureConfig,
): Array<{ key: string; text: string }> {
  const ORDERED_KEYS: Array<keyof SelfAppDisclosureConfig> = [
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

  const items: Array<{ key: string; text: string }> = [];

  for (const key of ORDERED_KEYS) {
    const isEnabled = disclosures[key];
    if (!isEnabled || (Array.isArray(isEnabled) && isEnabled.length === 0)) {
      continue;
    }

    let text = '';
    switch (key) {
      case 'ofac':
        text = 'Not on the OFAC list';
        break;
      case 'excludedCountries':
        text = `Not a citizen of: ${countriesToSentence(
          (disclosures.excludedCountries as Country3LetterCode[]) || [],
        )}`;
        break;
      case 'minimumAge':
        text = `Age is over ${disclosures.minimumAge}`;
        break;
      case 'name':
        text = 'Name';
        break;
      case 'passport_number':
        text = 'Passport Number';
        break;
      case 'date_of_birth':
        text = 'Date of Birth';
        break;
      case 'gender':
        text = 'Gender';
        break;
      case 'expiry_date':
        text = 'Passport Expiry Date';
        break;
      case 'issuing_state':
        text = 'Issuing State';
        break;
      case 'nationality':
        text = 'Nationality';
        break;
      default:
        continue;
    }
    items.push({ key, text });
  }

  return items;
}
