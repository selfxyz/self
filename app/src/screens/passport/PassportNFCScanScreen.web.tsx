// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { Image } from 'tamagui';

import { SecondaryButton } from '@src/components/buttons/SecondaryButton';
import ButtonsContainer from '@src/components/ButtonsContainer';
import TextsContainer from '@src/components/TextsContainer';
import { BodyText } from '@src/components/typography/BodyText';
import { Title } from '@src/components/typography/Title';
import { PassportEvents } from '@src/consts/analytics';
import useHapticNavigation from '@src/hooks/useHapticNavigation';
import NFC_IMAGE from '@src/images/nfc.png';
import { ExpandableBottomLayout } from '@src/layouts/ExpandableBottomLayout';
import { black, slate100, white } from '@src/utils/colors';
import { hasAnyValidRegisteredDocument } from '@src/utils/proving/validateDocument';

interface PassportNFCScanScreenProps {}

const PassportNFCScanScreen: React.FC<PassportNFCScanScreenProps> = ({}) => {
  const navigateToLaunch = useHapticNavigation('Launch', {
    action: 'cancel',
  });
  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });

  const onCancelPress = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument();
    if (hasValidDocument) {
      navigateToHome();
    } else {
      navigateToLaunch();
    }
  };

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection roundTop backgroundColor={slate100}>
        <>Animation Goes Here</>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <>
          <TextsContainer>
            <Title children="Ready to scan" />
            <BodyText textAlign="center">TODO implement</BodyText>
          </TextsContainer>
          <Image
            height="$8"
            width="$8"
            alignSelf="center"
            borderRadius={1000}
            source={{
              uri: NFC_IMAGE,
            }}
            margin={20}
          />
        </>
        <ButtonsContainer>
          <SecondaryButton
            trackEvent={PassportEvents.CANCEL_PASSPORT_NFC}
            onPress={onCancelPress}
          >
            Cancel
          </SecondaryButton>
        </ButtonsContainer>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default PassportNFCScanScreen;
