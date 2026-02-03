// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import type { AadhaarData } from '@selfxyz/common';
import type { PassportData } from '@selfxyz/common/types/passport';
import type { KycData } from '@selfxyz/common/utils/types';
import {
  isAadhaarDocument,
  isKycDocument,
  isMRZDocument,
} from '@selfxyz/common/utils/types';
import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import { white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot, plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import CardBackgroundId1 from '@/assets/images/card_background_id1.png';
import DevCardLogo from '@/assets/images/dev_card_logo.svg';
import DevCardWave from '@/assets/images/dev_card_wave.svg';
import KycIdCard from '@/components/homescreen/KycIdCard';
import { SvgXml } from '@/components/homescreen/SvgXmlWrapper';
import { getDocumentAttributes } from '@/utils/documentAttributes';

import { getSecurityLevel } from './cardSecurityBadge';

// Self logo SVG (white version for header right on real documents)
const selfLogoSvg = `<svg width="47" height="46" viewBox="0 0 47 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.7814 13.2168C12.7814 12.7057 13.1992 12.2969 13.7214 12.2969H30.0017L42.5676 0H11.2408L0 11.0001V29.0973H12.7814V13.2104V13.2168Z" fill="white"/>
<path d="M34.2186 16.8515V32.3552C34.2186 32.8663 33.8008 33.2751 33.2786 33.2751H17.4357L4.43236 46H35.7592L47 34.9999V16.8579H34.2186V16.8515Z" fill="white"/>
<path d="M28.9703 17.6525H18.0362V28.3539H28.9703V17.6525Z" fill="#00FFB6"/>
</svg>`;

// Design tokens from Figma
const DEV_LOGO_BG = '#52525B'; // zinc/600 - grey circle background for dev logo
const DEV_BODY_COLOR = '#1E1B4B'; // indigo/950 - dev card body background

interface IdCardLayoutAttributes {
  idDocument: PassportData | AadhaarData | KycData | null;
  selected: boolean;
  hidden: boolean;
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
}) => {
  if (!idDocument) {
    return null;
  }

  // KYC documents use a distinct dark card design
  if (isKycDocument(idDocument)) {
    return (
      <KycIdCard idDocument={idDocument} selected={selected} hidden={hidden} />
    );
  }

  const { width: screenWidth } = Dimensions.get('window');

  // Card dimensions (matching Figma: 353x224 for expanded, 353x67 for header only)
  const cardWidth = screenWidth * 0.95 - 16;
  const cardHeight = selected ? cardWidth * 0.635 : cardWidth * 0.19;
  const borderRadius = 12;
  const padding = cardWidth * 0.04;

  // Get document attributes
  const attributes = getDocumentAttributes(idDocument);
  const nationalityCode = attributes.nationalitySlice.replace(/</g, '').trim();

  // Check if this is a mock/dev document
  const isMockDocument = Boolean(idDocument.mock);

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
  const securityLevel = getSecurityLevel(idDocument);

  // Header title - add "DEV" prefix for mock documents
  const headerTitle = isMockDocument
    ? `DEV ${getDocumentTypeLabel()}`
    : getDocumentTypeLabel();

  // Subtitle text
  const subtitleText = isMockDocument
    ? `SELF DEVELOPER ${getDocumentTypeLabel()}`
    : `VERIFIED ${nationalityCode} ${getDocumentTypeLabel()}`;

  // Bottom label (e.g., "US PASSPORT") - only for real documents
  const bottomLabel = `${nationalityCode} ${getDocumentTypeLabel()}`;

  // Figma exact dimensions (scaled from 353px reference width)
  const scale = cardWidth / 353;
  const headerHeight = 67 * scale;
  const bodyHeight = 157 * scale;
  const figmaPadding = 14 * scale;
  const logoCircleSize = 32 * scale;
  const logoIconSize = 18 * scale;
  const headerGap = 12 * scale;

  // Get truncated selfId for display (e.g., "0xd9..b94")
  const getTruncatedId = (): string => {
    if (isMRZDocument(idDocument) && idDocument.selfId) {
      const id = idDocument.selfId;
      if (id.length > 10) {
        return `${id.slice(0, 4)}..${id.slice(-3)}`;
      }
      return id;
    }
    if (isAadhaarDocument(idDocument)) {
      const last4 = idDocument.extractedFields?.aadhaarLast4Digits;
      return last4 ? `****${last4}` : '';
    }
    return '';
  };

  const truncatedId = getTruncatedId();

  // Font sizes
  const fontSize = {
    header: cardWidth * 0.057, // 20px at 353px width
    subtitle: cardWidth * 0.02, // 7px at 353px width
    badge: cardWidth * 0.028, // 10px at 353px width
    bottomLabel: cardWidth * 0.043, // 15px at 353px width
    bottomId: cardWidth * 0.028, // 10px at 353px width
  };

  return (
    <YStack width="100%" alignItems="center" justifyContent="center">
      <YStack
        width={cardWidth}
        height={cardHeight}
        borderRadius={borderRadius}
        overflow="hidden"
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.25}
        shadowRadius={14}
        elevation={8}
        marginBottom={8}
      >
        {/* Header Section - Dark gradient */}
        <LinearGradient
          colors={['#000000', '#343434']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.header,
            {
              height: headerHeight,
              padding: figmaPadding,
            },
          ]}
        >
          {/* Content row */}
          <XStack flex={1} alignItems="center">
            {/* Logo + Text */}
            <XStack alignItems="center" gap={headerGap} flex={1}>
              {isMockDocument ? (
                // Dev card: Self logo (white) in grey circle - exact Figma asset
                <YStack
                  width={logoCircleSize}
                  height={logoCircleSize}
                  borderRadius={logoCircleSize / 2}
                  backgroundColor={DEV_LOGO_BG}
                  alignItems="center"
                  justifyContent="center"
                  overflow="hidden"
                >
                  <DevCardLogo width={logoIconSize} height={logoIconSize} />
                </YStack>
              ) : (
                // Real document: Country flag
                <RoundFlag
                  countryCode={nationalityCode}
                  size={logoCircleSize}
                />
              )}
              {/* Text container */}
              <YStack gap={2}>
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.header}
                  fontWeight="500"
                  color={white}
                  textTransform="uppercase"
                  lineHeight={fontSize.header * 1.1}
                >
                  {headerTitle}
                </Text>
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.subtitle}
                  color="#9193A2"
                  letterSpacing={0.7}
                  textTransform="uppercase"
                >
                  {subtitleText}
                </Text>
              </YStack>
            </XStack>

            {/* Right spacer for dev cards, Self logo for real documents */}
            {isMockDocument ? (
              // Empty spacer matching Figma (85x19)
              <YStack width={85 * scale} height={19 * scale} />
            ) : (
              <SvgXml
                xml={selfLogoSvg}
                width={logoIconSize}
                height={logoIconSize}
              />
            )}
          </XStack>
        </LinearGradient>

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
                styles.body,
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
            // Real document body - composited background with wave pattern
            <YStack style={styles.body}>
              {/* Pre-composited background image (colorful gradient + chrome wave) */}
              <Image
                source={CardBackgroundId1}
                style={styles.backgroundImage}
                resizeMode="cover"
              />

              {/* Bottom content: Left text + Right badge (real documents only) */}
              <XStack
                position="absolute"
                bottom={padding}
                left={padding}
                right={padding}
                justifyContent="space-between"
                alignItems="flex-end"
              >
                {/* Bottom Left: ID + Document Label */}
                <YStack gap={4}>
                  {truncatedId ? (
                    <Text
                      fontFamily={plexMono}
                      fontSize={fontSize.bottomId}
                      color={white}
                    >
                      {truncatedId}
                    </Text>
                  ) : null}
                  <Text
                    fontFamily={dinot}
                    fontSize={fontSize.bottomLabel}
                    fontWeight="500"
                    color={white}
                    textTransform="uppercase"
                    letterSpacing={0.6}
                  >
                    {bottomLabel}
                  </Text>
                </YStack>

                {/* Security Badge */}
                <YStack
                  backgroundColor="rgba(0, 0, 0, 0.5)"
                  borderRadius={30}
                  paddingHorizontal={padding * 0.6}
                  paddingVertical={padding * 0.3}
                >
                  <Text
                    fontFamily={dinot}
                    fontSize={fontSize.badge}
                    fontWeight="500"
                    color={white}
                    textTransform="uppercase"
                    letterSpacing={0.6}
                  >
                    {securityLevel}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          ))}
      </YStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  header: {
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});

export default IdCardLayout;
