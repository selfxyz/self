import React from 'react';

import { XStack, YStack } from 'tamagui';

import { DisclosureOptions } from '../../../common/src/utils/appType';
import { BodyText } from '../components/typography/BodyText';
import { Numerical } from '../components/typography/Numerical';
import CheckMark from '../images/icons/checkmark.svg';
import { slate200, slate400, slate500 } from '../utils/colors';

interface DisclosureProps {
  disclosures: DisclosureOptions;
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
  const enabledDisclosures = React.useMemo(
    () => disclosures.filter(disclosure => disclosure.enabled),
    [disclosures],
  );

  return (
    <YStack>
      {enabledDisclosures.map(disclosure => {
        let text = '';
        switch (disclosure.key) {
          case 'ofac':
            text = 'I am not on the OFAC list';
            return <DisclosureItem key={disclosure.key} text={text} />;
          case 'excludedCountries':
            text = `I am not a resident of any of the following countries: ${listToString(
              disclosure.value,
            )}`;
            return <DisclosureItem key={disclosure.key} text={text} />;
          case 'nationality':
            text = `I have a valid passport from ${disclosure.value}`;
            return <DisclosureItem key={disclosure.key} text={text} />;
          case 'minimumAge':
            text = `Age [over ${disclosure.value}]`;
            return <DisclosureItem key={disclosure.key} text={text} />;
          default: {
            // TODO disclosureOptions does not have a type for this case yet. will wait for team to add it
            return (
              <DiscloseAddress
                key={'address'}
                text="I control the following wallet address:"
                address={'0x'}
              />
            );
          }
        }
      })}
    </YStack>
  );
}

interface DisclosureItemProps {
  text: string;
  type?: string;
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

interface DiscloseAddressProps {
  text: string;
  address: string;
}

const DiscloseAddress: React.FC<DiscloseAddressProps> = ({
  text,
  address,
}: DiscloseAddressProps) => {
  return (
    <YStack gap={10} paddingVertical={22} paddingHorizontal={10}>
      <XStack gap={10}>
        <CheckMark width={22} />
        <BodyText color={slate500}>{text}</BodyText>
      </XStack>
      <YStack
        gap={8}
        borderRadius={10}
        borderColor={slate200}
        borderWidth={1}
        padding={8}
        marginStart={34}
      >
        <BodyText color={slate400}>Address</BodyText>
        <Numerical>{address}</Numerical>
      </YStack>
    </YStack>
  );
};
