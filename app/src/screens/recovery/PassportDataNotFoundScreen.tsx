// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useEffect } from 'react';

import { PrimaryButton } from '@src/components/buttons/PrimaryButton';
import Description from '@src/components/typography/Description';
import { Title } from '@src/components/typography/Title';
import useHapticNavigation from '@src/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@src/layouts/ExpandableBottomLayout';
import analytics from '@src/utils/analytics';
import { black, slate200, white } from '@src/utils/colors';
import { hasAnyValidRegisteredDocument } from '@src/utils/proving/validateDocument';

const { flush: flushAnalytics } = analytics();

const PassportDataNotFound: React.FC = () => {
  const navigateToLaunch = useHapticNavigation('Launch');
  const navigateToHome = useHapticNavigation('Home');

  const onPress = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument();
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

export default PassportDataNotFound;
