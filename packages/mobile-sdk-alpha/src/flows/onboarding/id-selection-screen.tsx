// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { Pressable, StyleSheet, Text, View as RNView } from 'react-native';

import { colors, fontFamily } from '@selfxyz/euclid-core';
import AadhaarLogo from '@selfxyz/mobile-sdk-alpha/svgs/icons/aadhaar.svg';
import EPassportLogoRounded from '@selfxyz/mobile-sdk-alpha/svgs/icons/epassport_rounded.svg';
import PassportCameraScanIcon from '@selfxyz/mobile-sdk-alpha/svgs/icons/passport_camera_scan.svg';
import PlusIcon from '@selfxyz/mobile-sdk-alpha/svgs/icons/plus.svg';
import SelfLogo from '@selfxyz/mobile-sdk-alpha/svgs/logo.svg';

import { resolveOnboardingBranch, trackOnboardingStep } from '../../analytics/onboardingFunnel';
import { BodyText, PerkRail, RoundFlag, View, XStack, YStack } from '../../components';
import { OnboardingEvents } from '../../constants/analytics';
import { useSelfClient } from '../../context';
import { buttonTap } from '../../haptic';
import { SdkEvents } from '../../types/events';
import { getDocumentBadgeLabel } from './badges';
import { getDocumentDisplaySubtitle, getDocumentDisplayTitle } from './documentCardCopy';
import { getPerkRailContent } from './perks';

const KYC_DOC_TYPE = 'kyc';

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
  countryCode: string;
  onPress: () => void;
};

const DocumentCard: React.FC<DocumentCardProps> = ({ docType, countryCode, onPress }) => {
  const subtitle = getDocumentDisplaySubtitle(docType, countryCode);
  const perkRailContent = getPerkRailContent(docType);
  const useFlag = docType !== KYC_DOC_TYPE;

  return (
    <View style={styles.cardOuter}>
      <RNView style={styles.cardInnerShadow}>
        <Pressable onPress={onPress} style={({ pressed }) => [styles.cardInner, pressed && styles.cardInnerPressed]}>
          <RNView style={styles.cardRow}>
            <RNView style={styles.cardLogoContainer}>
              {useFlag ? <RoundFlag countryCode={countryCode} size={32} /> : getDocumentLogo(docType)}
            </RNView>
            <RNView style={styles.cardContentColumn}>
              <Text style={styles.cardTitle}>{getDocumentDisplayTitle(docType, countryCode)}</Text>
              {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
            </RNView>
            <RNView style={styles.hiSecurityPill}>
              <Text style={styles.hiSecurityText}>{getDocumentBadgeLabel(docType)}</Text>
            </RNView>
          </RNView>
        </Pressable>
      </RNView>
      {perkRailContent && (
        <PerkRail
          variant={perkRailContent.logos.length > 1 ? 'dense' : 'minimal'}
          logos={perkRailContent.logos}
          label={perkRailContent.label}
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

  const onTapKyc = () => {
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
          <DocumentCard
            key={docType}
            docType={docType}
            countryCode={countryCode}
            onPress={() => onSelectDocumentType(docType)}
          />
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
    backgroundColor: colors.slate50,
    borderColor: colors.slate200,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'visible',
  },
  cardInnerShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
    borderRadius: 18,
    zIndex: 1,
  },
  cardInner: {
    backgroundColor: colors.white,
    borderColor: colors.zinc200,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: 'hidden',
    padding: 16,
    zIndex: 1,
  },
  cardInnerPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  cardRow: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLogoContainer: {
    width: 32,
    height: 32,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContentColumn: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  cardTitle: {
    fontFamily: fontFamily.dinOT.native,
    fontSize: 16,
    lineHeight: 21,
    color: colors.black,
  },
  cardSubtitle: {
    fontFamily: fontFamily.dinOT.native,
    fontSize: 14,
    lineHeight: 18,
    color: colors.slate500,
  },
  hiSecurityPill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  hiSecurityText: {
    fontFamily: fontFamily.dinOT.native,
    fontSize: 10,
    lineHeight: 12.9,
    letterSpacing: 0.6,
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
