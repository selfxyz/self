// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { YStack } from '@selfxyz/mobile-sdk-alpha/components';
import { slate100 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import SDKCountryPickerScreen from '@selfxyz/mobile-sdk-alpha/onboarding/country-picker-screen';

import { DocumentFlowNavBar } from '@/components/navbar/DocumentFlowNavBar';

export default function CountryPickerScreen() {
  return (
    <YStack flex={1} backgroundColor={slate100}>
      <DocumentFlowNavBar title="GETTING STARTED" />
      <SDKCountryPickerScreen />
    </YStack>
  );
}
