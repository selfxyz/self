import type { SelfAppDisclosureConfig } from '@selfxyz/common';
import { Country3LetterCode, countryCodes } from '@selfxyz/common';
import React from 'react';
import { XStack, YStack } from 'tamagui';

import { BodyText } from '@selfxyz/ui/dist/typography/BodyText';
import CheckMark from './icons/checkmark.svg';
import { slate200, slate500 } from '../utils/colors';

interface DisclosureProps {
  disclosures: SelfAppDisclosureConfig;
}

function listToString(list: string[]): string {
  if (list.length === 1) {
    return list[0];
  } else if (list.length === 2) {
    return list.join(' nor ');
  }
  return `${list.slice(0, -1).join(', ')} nor ${list.at(-1)}`;
}

export default function Disclosures({ disclosures }: DisclosureProps) {
  // Define the order in which disclosures should appear.
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

  return (
    <YStack>
      {ORDERED_KEYS.map(key => {
        const isEnabled = disclosures[key];
        if (
          !isEnabled ||
          (Array.isArray(isEnabled) && isEnabled.length === 0)
        ) {
          return null;
        }

        let text = '';
        switch (key) {
          case 'ofac':
            text = 'I am not on the OFAC sanction list';
            break;
          case 'excludedCountries':
            text = `I am not a citizen of the following countries: ${countriesToSentence(
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
            return null;
        }
        return <DisclosureItem key={key} text={text} />;
      })}
    </YStack>
  );
}

function countriesToSentence(countries: Array<Country3LetterCode>): string {
  return listToString(countries.map(country => countryCodes[country]));
}

interface DisclosureItemProps {
  text: string;
}

const DisclosureItem: React.FC<DisclosureItemProps> = ({
  text,
}: DisclosureItemProps) => {
  return (
    <XStack
      gap={10}
      borderBottomColor={slate200}
      borderBottomWidth={1}
      paddingVertical={22}
      paddingHorizontal={10}
    >
      <CheckMark width={22} />
      <BodyText textBreakStrategy="balanced" color={slate500}>
        {text}
      </BodyText>
    </XStack>
  );
};
