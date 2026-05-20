// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { type FC, useCallback, useEffect, useMemo, useRef } from 'react';
import { Image, Linking, Pressable, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';

import type { AadhaarData } from '@selfxyz/common';
import type { PassportData } from '@selfxyz/common/types/passport';
import type { KycData } from '@selfxyz/common/utils/types';
import {
  isAadhaarDocument,
  isKycDocument,
  isMRZDocument,
} from '@selfxyz/common/utils/types';
import { WarningTriangleIcon } from '@selfxyz/euclid/dist/components/icons/WarningTriangleIcon';
import {
  getPerkRecordsForIdType,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { PerkRail, RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import { HomescreenEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  red600,
  white,
  yellow500,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import GoogleLogo from '@selfxyz/mobile-sdk-alpha/svgs/icons/google.svg';

import CardBackgroundId1 from '@/assets/images/card_background_id1.png';
import CardBackgroundId2 from '@/assets/images/card_background_id2.png';
import CardBackgroundId3 from '@/assets/images/card_background_id3.png';
import CardBackgroundId4 from '@/assets/images/card_background_id4.png';
import CardBackgroundId5 from '@/assets/images/card_background_id5.png';
import CardBackgroundId6 from '@/assets/images/card_background_id6.png';
import DevCardLogo from '@/assets/images/dev_card_logo.svg';
import DevCardWave from '@/assets/images/dev_card_wave.svg';
import SelfLogoPending from '@/assets/images/self_logo_pending.svg';
import WaveOverlay from '@/assets/images/wave_overlay.png';
import CardBottomContent from '@/components/homescreen/CardBottomContent';
import CardHeader from '@/components/homescreen/CardHeader';
import { getSecurityBadgeLabel } from '@/components/homescreen/cardSecurityBadge';
import { cardStyles } from '@/components/homescreen/cardStyles';
import IdCardRevealed from '@/components/homescreen/IdCardRevealed';
import KycIdCard from '@/components/homescreen/KycIdCard';
import { useCardDimensions } from '@/hooks/useCardDimensions';
import { getBackgroundIndex } from '@/utils/cardBackgroundSelector';
import { getCountryDemonym } from '@/utils/countryDemonyms';
import { getDocumentAttributes } from '@/utils/documentAttributes';
import { idTypeForDocumentCategory } from '@/utils/idType';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';

const PERK_LOGO_BY_ID: Record<string, () => React.ReactNode> = {
  google_cloud_faucet: () => <GoogleLogo width={20} height={20} />,
};

const CARD_BACKGROUNDS = [
  CardBackgroundId1,
  CardBackgroundId2,
  CardBackgroundId3,
  CardBackgroundId4,
  CardBackgroundId5,
  CardBackgroundId6,
];

// Design tokens from Figma
const DEV_LOGO_BG = '#52525B'; // zinc/600 - grey circle background for dev logo
const DEV_BODY_COLOR = '#1E1B4B'; // indigo/950 - dev card body background

interface IdCardLayoutAttributes {
  idDocument: PassportData | AadhaarData | KycData | null;
  selected: boolean;
  hidden: boolean;
  isInactive?: boolean;
  showPerks?: boolean;
}

/**
 * Dark card design for passport, ID card, and Aadhaar documents.
 * Features:
 * - Dark gradient background with colored wave pattern
 * - Country flag in header
 * - Security badge (HI-SECURITY, LOW-SECURITY based on NFC)
 * - Document type and nationality display
 */
const IdCardLayout: FC<IdCardLayoutAttributes> = ({
  idDocument,
  selected,
  hidden,
  isInactive = false,
  showPerks = true,
}) => {
  const navigation = useNavigation();
  const { trackEvent } = useSelfClient();
  const navigateToDocumentOnboarding = useCallback(() => {
    switch (idDocument?.documentCategory) {
      case 'passport':
      case 'id_card':
        navigation.navigate('DocumentOnboarding');
        break;
      case 'aadhaar':
        navigation.navigate('AadhaarUpload', { countryCode: 'IND' });
        break;
    }
  }, [idDocument?.documentCategory, navigation]);

  const handleInactivePress = useCallback(() => {
    const callbackId = registerModalCallbacks({
      onButtonPress: navigateToDocumentOnboarding,
      onModalDismiss: () => {},
    });

    navigation.navigate('Modal', {
      titleText: 'Your ID needs to be reactivated to continue',
      bodyText:
        'Make sure that you have your document and recovery method ready.',
      buttonText: 'Continue',
      secondaryButtonText: 'Not now',
      callbackId,
    });
  }, [navigateToDocumentOnboarding, navigation]);

  // Early return if document is null
  // Call hooks at the top, before any conditional returns
  const {
    cardWidth,
    cardHeight,
    borderRadius,
    scale,
    headerHeight,
    figmaPadding,
    logoSize,
    headerGap,
    fontSize,
  } = useCardDimensions(selected);

  const isMockDocument = Boolean(idDocument?.mock);
  const idType = useMemo(
    () =>
      idDocument && !isMockDocument
        ? idTypeForDocumentCategory(idDocument.documentCategory)
        : null,
    [idDocument, isMockDocument],
  );
  const perkRecords = useMemo(
    () => (idType ? getPerkRecordsForIdType(idType) : []),
    [idType],
  );
  const documentViewKey = useMemo(() => {
    if (!idDocument || !idType) {
      return null;
    }
    if (isMRZDocument(idDocument)) {
      return `${idType}:${idDocument.mrz}`;
    }
    if (isAadhaarDocument(idDocument)) {
      return `${idType}:${idDocument.qrData}`;
    }
    return `${idType}:${idDocument.documentCategory}`;
  }, [idDocument, idType]);

  const perksVisible =
    showPerks &&
    selected &&
    hidden &&
    !isInactive &&
    !isMockDocument &&
    perkRecords.length > 0 &&
    idDocument != null &&
    !isKycDocument(idDocument);

  const viewedDocumentKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !perksVisible ||
      !idType ||
      !documentViewKey ||
      viewedDocumentKeyRef.current === documentViewKey
    ) {
      return;
    }
    viewedDocumentKeyRef.current = documentViewKey;
    trackEvent(HomescreenEvents.ID_CARD_VIEWED, {
      id_type: idType,
      has_perks: true,
      perk_count: perkRecords.length,
    });
  }, [perksVisible, idType, documentViewKey, perkRecords.length, trackEvent]);

  const handlePerkPress = useCallback(async () => {
    const first = perkRecords[0];
    if (!first) {
      return;
    }
    trackEvent(HomescreenEvents.ID_CARD_PERK_TAPPED, {
      id_type: idType,
      perk_id: first.id,
      has_outlink: Boolean(first.outlinkUrl),
    });
    if (!first.outlinkUrl) {
      return;
    }
    try {
      await Linking.openURL(first.outlinkUrl);
    } catch {
      trackEvent(HomescreenEvents.ID_CARD_PERK_OUTLINK_OPEN_FAILED, {
        id_type: idType,
        perk_id: first.id,
      });
    }
  }, [perkRecords, idType, trackEvent]);

  if (!idDocument) {
    return null;
  }

  // KYC documents use a distinct dark card design
  if (isKycDocument(idDocument)) {
    return (
      <KycIdCard idDocument={idDocument} selected={selected} hidden={hidden} />
    );
  }

  // When data is revealed (hidden=false), show the white data-view card
  if (!hidden && selected) {
    return <IdCardRevealed idDocument={idDocument} />;
  }

  const padding = cardWidth * 0.04;

  // Get document attributes
  const attributes = getDocumentAttributes(idDocument);
  // Handle special case: German passports use "D<<" as nationality code
  // Must normalize BEFORE stripping < characters
  const rawNationality = attributes.nationalitySlice;
  const nationalityCode =
    rawNationality === 'D<<' || rawNationality.startsWith('D<')
      ? 'DEU'
      : rawNationality.replace(/</g, '').trim();
  const countryDemonym = getCountryDemonym(nationalityCode);

  // Get deterministic background based on document data
  const backgroundIndex = getBackgroundIndex(idDocument);
  const cardBackground = CARD_BACKGROUNDS[backgroundIndex - 1];

  // Determine document type label
  const getDocumentTypeLabel = (): string => {
    if (isAadhaarDocument(idDocument)) {
      return 'AADHAAR';
    }
    if (isMRZDocument(idDocument)) {
      return idDocument.documentCategory === 'passport'
        ? 'PASSPORT'
        : 'ID CARD';
    }
    return 'DOCUMENT';
  };

  // Get security level for badge (only for real documents)
  const securityBadgeLabel = getSecurityBadgeLabel(idDocument);

  // Header title - add "DEV" prefix for mock documents
  const headerTitle = isMockDocument
    ? `DEV ${getDocumentTypeLabel()}`
    : getDocumentTypeLabel();

  // Subtitle text (uses demonym: "VERIFIED AMERICAN PASSPORT")
  const subtitleText = isMockDocument
    ? `SELF DEVELOPER ${getDocumentTypeLabel()}`
    : `VERIFIED ${countryDemonym} ${getDocumentTypeLabel()}`;

  // Bottom label (uses demonym: "AMERICAN PASSPORT")
  const bottomLabel = `${countryDemonym} ${getDocumentTypeLabel()}`;

  const bodyHeight = cardHeight - headerHeight;

  // Get truncated selfId for display (e.g., "0xd9..b94")
  const getTruncatedId = (): string => {
    if (isMRZDocument(idDocument)) {
      // Use selfId if available, otherwise generate a deterministic mock ID from MRZ
      const id = (idDocument as PassportData & { selfId?: string }).selfId;
      if (id && id.length > 10) {
        return `${id.slice(0, 4)}..${id.slice(-3)}`;
      }
      if (id) {
        return id;
      }
      // Generate mock display ID from MRZ hash for visual testing
      const mrz = idDocument.mrz;
      let hash = 0;
      for (let i = 0; i < mrz.length; i++) {
        // eslint-disable-next-line no-bitwise
        hash = (hash * 31 + mrz.charCodeAt(i)) >>> 0;
      }
      const mockId = `0x${hash.toString(16).padStart(8, '0')}`;
      return `${mockId.slice(0, 4)}..${mockId.slice(-3)}`;
    }
    if (isAadhaarDocument(idDocument)) {
      const last4 = idDocument.extractedFields?.aadhaarLast4Digits;
      return last4 ? `****${last4}` : '';
    }
    return '';
  };

  const truncatedId = getTruncatedId();

  return (
    // Container wrapper to handle shadow space properly
    <YStack
      width="100%" // Add space for horizontal margins
      alignItems="center"
      justifyContent="center"
    >
      {isInactive && (
        <Pressable
          style={styles.inactiveWarningContainer}
          onPress={handleInactivePress}
        >
          <XStack
            backgroundColor={red600}
            borderRadius={8}
            padding={16}
            gap={16}
          >
            <YStack padding={8} backgroundColor={white} borderRadius={8}>
              <WarningTriangleIcon color={yellow500} />
            </YStack>
            <YStack gap={4}>
              <Text
                color={white}
                fontFamily={dinot}
                fontSize={16}
                fontWeight="500"
              >
                Your document is inactive
              </Text>
              <Text
                color={white}
                fontFamily={dinot}
                fontSize={14}
                fontWeight="400"
              >
                Tap here to recover your ID
              </Text>
            </YStack>
          </XStack>
        </Pressable>
      )}
      <YStack
        width={cardWidth}
        borderRadius={borderRadius}
        overflow="hidden"
        shadowColor={black}
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.25}
        shadowRadius={14}
        elevation={8}
        marginBottom={8}
      >
        <YStack
          height={cardHeight}
          backgroundColor={black}
          alignItems="stretch"
        >
          {/* Header Section - Dark gradient */}
          <CardHeader
            variant="gradient"
            title={headerTitle}
            subtitle={subtitleText}
            headerHeight={headerHeight}
            figmaPadding={figmaPadding}
            headerGap={headerGap}
            fontSize={fontSize}
            logo={
              isMockDocument ? (
                <YStack
                  width={logoSize}
                  height={logoSize}
                  borderRadius={logoSize / 2}
                  backgroundColor={DEV_LOGO_BG}
                  alignItems="center"
                  justifyContent="center"
                  overflow="hidden"
                >
                  <DevCardLogo width={logoSize} height={logoSize} />
                </YStack>
              ) : (
                <RoundFlag countryCode={nationalityCode} size={logoSize} />
              )
            }
            rightElement={
              isMockDocument ? (
                <YStack width={85 * scale} height={19 * scale} />
              ) : (
                <SelfLogoPending width={logoSize} height={logoSize} />
              )
            }
          />

          {/* Gradient divider line for dev cards - dark edges, light middle */}
          {isMockDocument && selected && (
            <LinearGradient
              colors={['#3a3a3a', '#747474', '#3a3a3a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 2, width: '100%' }}
            />
          )}

          {/* Body Section - Dark gradient with wave pattern */}
          {selected &&
            (isMockDocument ? (
              // Dev card body - solid indigo background with wave pattern (exact Figma)
              <YStack
                style={[
                  cardStyles.body,
                  { backgroundColor: DEV_BODY_COLOR, height: bodyHeight },
                ]}
              >
                {/* Wave pattern - exact Figma asset with exact positioning */}
                {/* Figma insets: top -10.53%, right 5.62%, bottom -57.11%, left -44.43% */}
                <YStack
                  position="absolute"
                  top={`${-10.53}%`}
                  right={`${5.62}%`}
                  bottom={`${-57.11}%`}
                  left={`${-44.43}%`}
                >
                  <DevCardWave
                    width="100%"
                    height="100%"
                    preserveAspectRatio="none"
                  />
                </YStack>
              </YStack>
            ) : (
              // Real document body - gradient background with wave overlay
              <YStack style={cardStyles.body}>
                {/* Gradient background */}
                <Image
                  source={cardBackground}
                  style={cardStyles.backgroundImage}
                  resizeMode="cover"
                />
                {/* Wave pattern overlay */}
                <Image
                  source={WaveOverlay}
                  style={styles.waveOverlay}
                  resizeMode="contain"
                />

                {/* Bottom content: Left text + Right badge (real documents only) */}
                <CardBottomContent
                  truncatedId={truncatedId}
                  bottomLabel={bottomLabel}
                  badges={[
                    ...(isInactive
                      ? [
                          {
                            text: 'INACTIVE',
                            backgroundColor: red600,
                            textColor: white,
                          },
                        ]
                      : []),
                    {
                      text: securityBadgeLabel,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      textColor: white,
                    },
                  ]}
                  padding={padding}
                  fontSize={fontSize}
                />
              </YStack>
            ))}
        </YStack>
        {perksVisible && (
          <YStack backgroundColor={white}>
            <PerkRail
              variant="dense"
              logos={perkRecords.map(record => {
                const factory = PERK_LOGO_BY_ID[record.id];
                return factory ? factory() : null;
              })}
              onPress={handlePerkPress}
            />
          </YStack>
        )}
      </YStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  waveOverlay: {
    position: 'absolute',
    top: -10,
    left: 0,
    width: '100%',
    height: '90%',
    opacity: 0.6,
  },
  inactiveWarningContainer: {
    width: '100%',
    marginBottom: 16,
  },
});

export default IdCardLayout;
