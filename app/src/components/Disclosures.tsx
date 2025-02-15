import React from 'react';

import { XStack, YStack } from 'tamagui';

import { SelfAppDisclosureConfig } from '../../../common/src/utils/appType';
import { BodyText } from '../components/typography/BodyText';
import CheckMark from '../images/icons/checkmark.svg';
import { slate200, slate500 } from '../utils/colors';

interface DisclosureProps {
  disclosures: SelfAppDisclosureConfig;
}

function listToString(list: string[]): string {
  if (list.length === 1) {
    return list[0];
  } else if (list.length === 2) {
    return list.join(' or ');
  }
  return `${list.slice(0, -1).join(', ')} or ${list.at(-1)}`;
}

export default function Disclosures({ disclosures }: DisclosureProps) {

  // Define the order in which disclosures should appear.
  const ORDERED_KEYS = [
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
        if (!isEnabled) {
          return null;
        }

        let text = '';
        switch (key) {
          case 'ofac':
            text = 'I am not on the OFAC list';
            break;
          case 'excludedCountries':
            text = `I am not a resident of any of the following countries: ${listToString(
              disclosures.excludedCountries || []
            )}`;
            break;
          case 'minimumAge':
            text = `Age [over ${disclosures.minimumAge}]`;
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
      <BodyText color={slate500}>{text}</BodyText>
    </XStack>
  );
};

// interface DiscloseAddressProps {
//   text: string;
//   address: string;
// }

// const DiscloseAddress: React.FC<DiscloseAddressProps> = ({
//   text,
//   address,
// }: DiscloseAddressProps) => {
//   return (
//     <YStack gap={10} paddingVertical={22} paddingHorizontal={10}>
//       <XStack gap={10}>
//         <CheckMark width={22} />
//         <BodyText color={slate500}>{text}</BodyText>
//       </XStack>
//       <YStack
//         gap={8}
//         borderRadius={10}
//         borderColor={slate200}
//         borderWidth={1}
//         padding={8}
//         marginStart={34}
//       >
//         <BodyText color={slate400}>Address</BodyText>
//         <Numerical>{address}</Numerical>
//       </YStack>
//     </YStack>
//   );
// };
