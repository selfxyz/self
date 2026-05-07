// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { colors, fontFamily } from '@selfxyz/euclid-core';

import AadhaarLogo from '../../../svgs/icons/aadhaar.svg';
import EPassportLogoRounded from '../../../svgs/icons/epassport_rounded.svg';
import PassportCameraScanIcon from '../../../svgs/icons/passport_camera_scan.svg';
import PlusIcon from '../../../svgs/icons/plus.svg';
import SelfLogo from '../../../svgs/logo.svg';
import { resolveOnboardingBranch, trackOnboardingStep } from '../../analytics/onboardingFunnel';
import { BodyText, PerkRail, RoundFlag, View, XStack, YStack } from '../../components';
import { OnboardingEvents, RegistrationPickerEvents } from '../../constants/analytics';
import { useSelfClient } from '../../context';
import { buttonTap } from '../../haptic';
import { SdkEvents } from '../../types/events';
import { getDocumentBadgeLabel, getDocumentPerkLabel } from './badges';
import { getPerksForIdType } from './perks';

const KYC_DOC_TYPE = 'kyc';

const getDocumentName = (docType: string): string => {
  switch (docType) {
    case 'p':
      return 'Passport';
    case 'i':
      return 'ID card';
    case 'a':
      return 'Aadhaar';
    case KYC_DOC_TYPE:
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
    case KYC_DOC_TYPE:
      return 'kyc';
    default:
      return 'unknown_document';
  }
};

const getDocumentSubtitle = (docType: string): string | null => {
  switch (docType) {
    case 'p':
      return 'Verified Biometric Passport';
    case 'i':
      return 'Verified Biometric ID card';
    case 'a':
      return 'Verified mAadhaar QR code';
    case KYC_DOC_TYPE:
      return "National ID, Driver's License etc.";
    default:
      return null;
  }
};

const getDocumentLogo = (docType: string): React.ReactNode => {
  switch (docType) {
    case 'p':
      return <EPassportLogoRounded width={32} height={32} />;
    case 'i':
      return <EPassportLogoRounded width={32} height={32} />;
    case 'a':
      return <AadhaarLogo width={32} height={32} />;
    case KYC_DOC_TYPE:
      return <PassportCameraScanIcon width={32} height={32} color={'#075985'} />;
    default:
      return null;
  }
};

type DocumentCardProps = {
  docType: string;
  onPress: () => void;
};

const DocumentCard: React.FC<DocumentCardProps> = ({ docType, onPress }) => {
  const subtitle = getDocumentSubtitle(docType);
  const perks = getPerksForIdType(docType);
  const perkLabel = getDocumentPerkLabel(docType);
  const hasPerks = perkLabel !== null;

  return (
    <View style={styles.cardOuter}>
      <View onPress={onPress} style={styles.cardInner} pressStyle={{ transform: [{ scale: 0.98 }], opacity: 0.95 }}>
        <XStack alignItems="center" gap={12} flex={1}>
          <View style={styles.cardLogoContainer}>{getDocumentLogo(docType)}</View>
          <YStack gap={4} flex={1}>
            <BodyText style={styles.cardTitle}>{getDocumentName(docType)}</BodyText>
            {subtitle && <BodyText style={styles.cardSubtitle}>{subtitle}</BodyText>}
          </YStack>
          <View style={styles.hiSecurityPill}>
            <BodyText style={styles.hiSecurityText}>{getDocumentBadgeLabel(docType)}</BodyText>
          </View>
        </XStack>
      </View>
      {hasPerks && (
        <PerkRail
          variant="minimal"
          logos={perks.map(p => p.renderLogo())}
          label={perkLabel ?? undefined}
          onPress={onPress}
        />
      )}
    </View>
  );
};

type IDSelectionScreenProps = {
  countryCode: string;
  documentTypes: string[];
};

const IDSelectionScreen: React.FC<IDSelectionScreenProps> = ({ countryCode, documentTypes }) => {
  const selfClient = useSelfClient();
  const biometricTypes = documentTypes.filter(t => t !== KYC_DOC_TYPE);

  const biometricTypesKey = biometricTypes.join(',');
  useEffect(() => {
    selfClient.trackEvent(RegistrationPickerEvents.VIEWED, {
      available_id_types: biometricTypesKey ? biometricTypesKey.split(',') : [],
    });
  }, [selfClient, biometricTypesKey]);

  const onSelectDocumentType = (docType: string) => {
    buttonTap();

    selfClient.getMRZState().update({ documentType: docType });

    const branch = resolveOnboardingBranch(docType);
    trackOnboardingStep(selfClient, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch,
      document_type: getDocumentNameForEvent(docType),
      country_code: countryCode,
    });

    const perks = getPerksForIdType(docType);
    selfClient.trackEvent(RegistrationPickerEvents.SELECTED, {
      id_type: getDocumentNameForEvent(docType),
      was_eligible_for_perks: perks.length > 0,
      perk_ids: perks.map(p => p.id),
    });

    selfClient.emit(SdkEvents.DOCUMENT_TYPE_SELECTED, {
      documentType: docType,
      documentName: getDocumentNameForEvent(docType),
      countryCode: countryCode,
    });
  };

  const onTapKyc = () => {
    selfClient.trackEvent(RegistrationPickerEvents.UNSUPPORTED_TAPPED, {
      country_code: countryCode,
    });
    onSelectDocumentType(KYC_DOC_TYPE);
  };

  return (
    <YStack flex={1} paddingTop="$4" paddingHorizontal="$4">
      <YStack alignItems="center" marginTop="$4" marginBottom="$5" gap={30}>
        <XStack alignItems="center" gap={10}>
          <View width={44} height={44}>
            <RoundFlag countryCode={countryCode} size={44} />
          </View>
          <PlusIcon width={18} height={18} color={colors.slate400} />
          <YStack
            backgroundColor={colors.black}
            borderRadius={3}
            height={46}
            width={46}
            justifyContent="center"
            alignItems="center"
          >
            <SelfLogo width={26} height={26} />
          </YStack>
        </XStack>
        <YStack alignItems="center" gap={16}>
          <BodyText style={styles.titleText}>Select an ID{'\n'}type to register</BodyText>
          <BodyText style={styles.subtitleText}>Be sure to have your{'\n'}document ready to scan</BodyText>
        </YStack>
      </YStack>

      <YStack gap={16}>
        {biometricTypes.map(docType => (
          <DocumentCard key={docType} docType={docType} onPress={() => onSelectDocumentType(docType)} />
        ))}
      </YStack>

      <YStack alignItems="center" marginTop={32} gap={16}>
        <BodyText style={styles.footerLabel}>LIMITED SECURITY IDS</BodyText>
        <View onPress={onTapKyc} style={styles.kycButton} pressStyle={{ transform: [{ scale: 0.98 }], opacity: 0.9 }}>
          <BodyText style={styles.kycButtonText}>View other supported IDs</BodyText>
          <View style={styles.betaPill}>
            <BodyText style={styles.betaText}>BETA</BodyText>
          </View>
        </View>
      </YStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  titleText: {
    fontFamily: fontFamily.advercase.native,
    fontSize: 28,
    letterSpacing: 1,
    color: colors.black,
    textAlign: 'center',
  },
  subtitleText: {
    fontFamily: fontFamily.dinOT.native,
    fontSize: 16,
    color: colors.black,
    textAlign: 'center',
  },
  cardOuter: {
    backgroundColor: colors.slate100,
    borderColor: colors.slate200,
    borderWidth: 2,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardInner: {
    backgroundColor: colors.white,
    borderColor: colors.zinc200,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardLogoContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fontFamily.dinOT.native,
    fontSize: 16,
    color: colors.black,
  },
  cardSubtitle: {
    fontFamily: fontFamily.dinOT.native,
    fontSize: 14,
    color: colors.slate500,
  },
  hiSecurityPill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 1,
  },
  hiSecurityText: {
    fontFamily: fontFamily.dinOT.native,
    fontSize: 10,
    lineHeight: 12.9,
    letterSpacing: 0.3,
    color: colors.white,
    textTransform: 'uppercase',
  },
  footerLabel: {
    fontFamily: fontFamily.ibmPlexMono.native,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.slate400,
    textTransform: 'uppercase',
  },
  kycButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderColor: colors.slate300,
    borderWidth: 1,
    borderRadius: 60,
  },
  kycButtonText: {
    fontFamily: fontFamily.dinOT.native,
    fontSize: 14,
    color: colors.black,
  },
  betaPill: {
    borderColor: colors.slate300,
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  betaText: {
    fontFamily: fontFamily.dinOT.native,
    fontSize: 10,
    lineHeight: 12.9,
    letterSpacing: 0.6,
    color: colors.slate500,
    textTransform: 'uppercase',
  },
});

export default IDSelectionScreen;
