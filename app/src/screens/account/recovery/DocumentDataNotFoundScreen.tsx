// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect } from 'react';

import {
  hasAnyValidRegisteredDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';

import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import Description from '@/components/typography/Description';
import { Title } from '@/components/typography/Title';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import analytics from '@/utils/analytics';
import { black, slate200, white } from '@/utils/colors';

const { flush: flushAnalytics } = analytics();

const DocumentDataNotFoundScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const navigateToLaunch = useHapticNavigation('Launch');
  const navigateToHome = useHapticNavigation('Home');

  const onPress = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument(selfClient);
    if (hasValidDocument) {
      navigateToHome();
    } else {
      navigateToLaunch();
    }
  };

  // error screen, flush analytics
  useEffect(() => {
    flushAnalytics();
  }, []);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <Title textAlign="center" style={{ color: white }}>
          ✨ Are you new here?
        </Title>
        <Description
          marginTop={8}
          textAlign="center"
          style={{ color: slate200 }}
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
