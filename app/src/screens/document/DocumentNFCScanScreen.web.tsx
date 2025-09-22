// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Image } from 'tamagui';

import {
  hasAnyValidRegisteredDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import ButtonsContainer from '@/components/ButtonsContainer';
import TextsContainer from '@/components/TextsContainer';
import { BodyText } from '@/components/typography/BodyText';
import { Title } from '@/components/typography/Title';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import NFC_IMAGE from '@/images/nfc.png';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { black, slate100, white } from '@/utils/colors';

const DocumentNFCScanScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const navigateToLaunch = useHapticNavigation('Launch', {
    action: 'cancel',
  });
  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });

  const onCancelPress = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument(selfClient);
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

export default DocumentNFCScanScreen;
