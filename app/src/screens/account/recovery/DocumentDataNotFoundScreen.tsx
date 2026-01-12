// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect } from 'react';

import {
  hasAnyValidRegisteredDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  Description,
  PrimaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate200,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { flush as flushAnalytics } from '@/services/analytics';

const DocumentDataNotFoundScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const navigateToCountryPicker = useHapticNavigation('CountryPicker');
  const navigateToHome = useHapticNavigation('Home');

  const onPress = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument(selfClient);
    if (hasValidDocument) {
      navigateToHome();
    } else {
      navigateToCountryPicker();
    }
  };

  // error screen, flush analytics
  useEffect(() => {
    flushAnalytics();
  }, []);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <Title style={{ textAlign: 'center', color: white }}>
          ✨ Are you new here?
        </Title>
        <Description
          style={{
            marginTop: 8,
            textAlign: 'center',
            color: slate200,
          }}
        >
          It seems like you need to go through the registration flow first.
        </Description>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        gap={20}
        height={150}
        backgroundColor={white}
      >
        <PrimaryButton onPress={onPress}>Go to Registration</PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default DocumentDataNotFoundScreen;
