// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { StyleSheet } from 'react-native';

import AadhaarLogo from '../../../svgs/icons/aadhaar.svg';
import EPassportLogoRounded from '../../../svgs/icons/epassport_rounded.svg';
import PlusIcon from '../../../svgs/icons/plus.svg';
import SelfLogo from '../../../svgs/logo.svg';
import { BodyText, RoundFlag, View, XStack, YStack } from '../../components';
import { black, slate100, slate300, slate400, white } from '../../constants/colors';
import { advercase, dinot } from '../../constants/fonts';
import { useSelfClient } from '../../context';
import { buttonTap } from '../../haptic';
import { SdkEvents } from '../../types/events';

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

type IDSelectionScreenProps = {
  countryCode: string;
  documentTypes: string[];
};

const IDSelectionScreen: React.FC<IDSelectionScreenProps> = props => {
  const { countryCode = '', documentTypes = [] } = props;
  const selfClient = useSelfClient();

  const onSelectDocumentType = (docType: string) => {
    buttonTap();

    selfClient.getMRZState().update({ documentType: docType });

    selfClient.emit(SdkEvents.DOCUMENT_TYPE_SELECTED, {
      documentType: docType,
      documentName: getDocumentNameForEvent(docType),
      countryCode: countryCode,
    });
  };

  return (
    <YStack flex={1} paddingTop="$4" paddingHorizontal="$4" justifyContent="center">
      <YStack marginTop="$4" marginBottom="$6">
        <XStack justifyContent="center" alignItems="center" borderRadius={'$2'} gap={'$2.5'}>
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
        <BodyText style={styles.titleText}>Select an ID type</BodyText>
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
            pressStyle={{
              transform: [{ scale: 0.97 }],
              backgroundColor: slate100,
            }}
            onPress={() => onSelectDocumentType(docType)}
          >
            <XStack alignItems="center" gap={'$3'} flex={1}>
              {getDocumentLogo(docType)}
              <YStack gap={'$1'}>
                <BodyText style={styles.documentNameText}>{getDocumentName(docType)}</BodyText>
                <BodyText style={styles.documentDescriptionText}>{getDocumentDescription(docType)}</BodyText>
              </YStack>
            </XStack>
          </XStack>
        ))}
        <BodyText style={styles.footerText}>Be sure your document is ready to scan</BodyText>
      </YStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  titleText: {
    marginTop: 48,
    fontSize: 29,
    fontFamily: advercase,
    textAlign: 'center',
    color: black,
  },
  documentNameText: {
    fontSize: 24,
    fontFamily: dinot,
    color: black,
  },
  documentDescriptionText: {
    fontSize: 14,
    fontFamily: dinot,
    color: slate400,
  },
  footerText: {
    fontSize: 18,
    fontFamily: dinot,
    color: slate400,
    textAlign: 'center',
  },
});

export default IDSelectionScreen;
