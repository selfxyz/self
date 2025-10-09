// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, XStack, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { SdkEvents, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import AadhaarLogo from '@selfxyz/mobile-sdk-alpha/svgs/icons/aadhaar.svg';
import EPassportLogoRounded from '@selfxyz/mobile-sdk-alpha/svgs/icons/epassport_rounded.svg';
import PlusIcon from '@selfxyz/mobile-sdk-alpha/svgs/icons/plus.svg';
import SelfLogo from '@selfxyz/mobile-sdk-alpha/svgs/logo.svg';

import { RoundFlag } from '@/components/flag/RoundFlag';
import { DocumentFlowNavBar } from '@/components/NavBar/DocumentFlowNavBar';
import { BodyText } from '@/components/typography/BodyText';
import type { RootStackParamList } from '@/navigation';
import { black, slate100, slate300, slate400, white } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import { advercase, dinot } from '@/utils/fonts';
import { buttonTap } from '@/utils/haptic';

type IDPickerScreenRouteProp = RouteProp<RootStackParamList, 'IDPicker'>;

const getDocumentName = (docType: string): string => {
  switch (docType) {
    case 'p':
      return 'Passport';
    case 'i':
      return 'ID card';
    case 'a':
      return 'Aadhaar';
    default:
      return 'Unknown Document';
  }
};

const getDocumentNameForEvent = (docType: string): string => {
  switch (docType) {
    case 'p':
      return 'passport';
    case 'i':
      return 'id_card';
    case 'a':
      return 'aadhaar';
    default:
      return 'unknown_document';
  }
};

const getDocumentDescription = (docType: string): string => {
  switch (docType) {
    case 'p':
      return 'Verified Biometric Passport';
    case 'i':
      return 'Verified Biometric ID card';
    case 'a':
      return 'Verified mAadhaar QR code';
    default:
      return 'Unknown Document';
  }
};

const getDocumentLogo = (docType: string): React.ReactNode => {
  switch (docType) {
    case 'p':
      return <EPassportLogoRounded />;
    case 'i':
      return <EPassportLogoRounded />;
    case 'a':
      return <AadhaarLogo />;
    default:
      return null;
  }
};

const IDPickerScreen: React.FC = () => {
  const route = useRoute<IDPickerScreenRouteProp>();
  const { countryCode = '', documentTypes = [] } = route.params || {};
  const bottom = useSafeAreaInsets().bottom;
  const selfClient = useSelfClient();

  const onSelectDocumentType = (docType: string) => {
    buttonTap();

    const countryName = getDocumentName(docType);

    selfClient.emit(SdkEvents.DOCUMENT_TYPE_SELECTED, {
      documentType: docType,
      documentName: getDocumentNameForEvent(docType),
      countryCode: countryCode,
      countryName: countryName,
    });
  };

  return (
    <YStack
      flex={1}
      backgroundColor={slate100}
      paddingBottom={bottom + extraYPadding + 24}
    >
      <DocumentFlowNavBar title="GETTING STARTED" />
      <YStack
        flex={1}
        paddingTop="$4"
        paddingHorizontal="$4"
        justifyContent="center"
      >
        <YStack marginTop="$4" marginBottom="$6">
          <XStack
            justifyContent="center"
            alignItems="center"
            borderRadius={'$2'}
            gap={'$2.5'}
          >
            <View width={48} height={48}>
              <RoundFlag countryCode={countryCode} size={48} />
            </View>
            <PlusIcon width={18} height={18} color={slate400} />
            <YStack
              backgroundColor={black}
              borderRadius={'$2'}
              height={48}
              width={48}
              justifyContent="center"
              alignItems="center"
            >
              <SelfLogo width={24} height={24} />
            </YStack>
          </XStack>
          <BodyText
            marginTop="$6"
            fontSize={29}
            fontFamily={advercase}
            textAlign="center"
          >
            Select an ID type
          </BodyText>
        </YStack>
        <YStack gap="$3">
          {documentTypes.map((docType: string) => (
            <XStack
              key={docType}
              backgroundColor={white}
              borderWidth={1}
              borderColor={slate300}
              elevation={4}
              borderRadius={'$5'}
              padding={'$3'}
              pressStyle={{ scale: 0.97, backgroundColor: slate100 }}
              onPress={() => onSelectDocumentType(docType)}
            >
              <XStack alignItems="center" gap={'$3'} flex={1}>
                {getDocumentLogo(docType)}
                <YStack gap={'$1'}>
                  <BodyText fontSize={24} fontFamily={dinot} color={black}>
                    {getDocumentName(docType)}
                  </BodyText>
                  <BodyText fontSize={14} fontFamily={dinot} color="#9193A2">
                    {getDocumentDescription(docType)}
                  </BodyText>
                </YStack>
              </XStack>
            </XStack>
          ))}
          <BodyText
            fontSize={18}
            fontFamily={dinot}
            color={slate400}
            textAlign="center"
          >
            Be sure your document is ready to scan
          </BodyText>
        </YStack>
      </YStack>
    </YStack>
  );
};

export default IDPickerScreen;
