// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { StyleSheet } from 'react-native';

import AadhaarLogo from '../../../svgs/icons/aadhaar.svg';
import EPassportLogoRounded from '../../../svgs/icons/epassport_rounded.svg';
import PassportCameraScanIcon from '../../../svgs/icons/passport_camera_scan.svg';
import PlusIcon from '../../../svgs/icons/plus.svg';
import SelfLogo from '../../../svgs/logo.svg';
import { resolveOnboardingBranch, trackOnboardingStep } from '../../analytics/onboardingFunnel';
import { BodyText, RoundFlag, View, XStack, YStack } from '../../components';
import { OnboardingEvents } from '../../constants/analytics';
import { black, blue100, blue600, slate100, slate300, slate400, white } from '../../constants/colors';
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
    case 'kyc':
      return 'Other IDs';
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
    case 'kyc':
      return 'kyc';
    default:
      return 'unknown_document';
  }
};

const getDocumentDescription = (docType: string): string | null => {
  switch (docType) {
    case 'p':
      return 'Verified Biometric Passport';
    case 'i':
      return 'Verified Biometric ID card';
    case 'a':
      return 'Verified mAadhaar QR code';
    case 'kyc':
      return "National ID, Driver's License etc.";
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
    case 'kyc':
      // same color as epassport_rounded.svg
      return <PassportCameraScanIcon color={'#075985'} />;
    default:
      return null;
  }
};

const getDocumentSecurityBadge = (docType: string): string | null => {
  switch (docType) {
    case 'p':
    case 'i':
    case 'a':
      return 'Best security';
    default:
      return null;
  }
};

type DocumentItemProps = {
  docType: string;
  onPress: () => void;
};

const DocumentItem: React.FC<DocumentItemProps> = ({ docType, onPress }) => {
  const securityBadge = getDocumentSecurityBadge(docType);
  const description = getDocumentDescription(docType);

  return (
    <XStack
      style={styles.documentItem}
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
      onPress={onPress}
    >
      <XStack alignItems="center" gap={'$3'} flex={1}>
        {securityBadge && <BodyText style={styles.securityBadgeText}>{securityBadge}</BodyText>}
        <View style={styles.documentLogoContainer}>{getDocumentLogo(docType)}</View>
        <YStack gap={'$1'}>
          <BodyText style={styles.documentNameText}>{getDocumentName(docType)}</BodyText>
          {description && <BodyText style={styles.documentDescriptionText}>{description}</BodyText>}
        </YStack>
      </XStack>
    </XStack>
  );
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

    const branch = resolveOnboardingBranch(docType);
    trackOnboardingStep(selfClient, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch,
      document_type: getDocumentNameForEvent(docType),
      country_code: countryCode,
    });

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
          <DocumentItem key={docType} docType={docType} onPress={() => onSelectDocumentType(docType)} />
        ))}
        <BodyText style={styles.footerText}>Be sure your document is ready to scan</BodyText>
        <View style={styles.kycContainer}>
          <DocumentItem docType="kyc" onPress={() => onSelectDocumentType('kyc')} />
        </View>
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
  documentLogoContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentItem: {
    position: 'relative',
    borderWidth: 1,
  },
  securityBadgeText: {
    fontSize: 12,
    fontFamily: dinot,
    color: blue600,
    backgroundColor: blue100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: blue600,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    top: -20,
    right: -20,
  },
  kycContainer: {
    marginTop: 36,
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
