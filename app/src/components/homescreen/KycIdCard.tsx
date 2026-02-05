// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { deserializeApplicantInfo } from '@selfxyz/common';
import { commonNames } from '@selfxyz/common/constants/countries';
import type { KycData } from '@selfxyz/common/utils/types';
import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import { white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot, plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import CardBackgroundId1 from '@/assets/images/card_background_id1.png';
import { SvgXml } from '@/components/homescreen/SvgXmlWrapper';

// Self logo SVG (white version for header right)
const selfLogoSvg = `<svg width="47" height="46" viewBox="0 0 47 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.7814 13.2168C12.7814 12.7057 13.1992 12.2969 13.7214 12.2969H30.0017L42.5676 0H11.2408L0 11.0001V29.0973H12.7814V13.2104V13.2168Z" fill="white"/>
<path d="M34.2186 16.8515V32.3552C34.2186 32.8663 33.8008 33.2751 33.2786 33.2751H17.4357L4.43236 46H35.7592L47 34.9999V16.8579H34.2186V16.8515Z" fill="white"/>
<path d="M28.9703 17.6525H18.0362V28.3539H28.9703V17.6525Z" fill="white"/>
</svg>`;

interface KycIdCardProps {
  idDocument: KycData;
  selected: boolean;
  hidden: boolean;
}

/**
 * Maps KYC idType to display title.
 * idType values from Sumsub: "drivers_licence", "passport", "NATIONAL ID", etc.
 */
function getKycDocTitle(idType: string): string {
  const normalized = idType
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .trim();
  if (normalized.includes('driver')) return 'DRIVERS LICENSE';
  if (normalized.includes('passport')) return 'PASSPORT';
  if (normalized.includes('national')) return 'NATIONAL ID';
  if (normalized.includes('residence')) return 'RESIDENCE PERMIT';
  return 'ID CARD';
}

/**
 * Derives a demonym-like adjective from the country code.
 * Falls back to the country code if no mapping found.
 */
function getCountryAdjective(countryCode: string): string {
  const name = commonNames[countryCode as keyof typeof commonNames];
  if (!name) return countryCode;

  const demonyms: Record<string, string> = {
    USA: 'US',
    GBR: 'UK',
    CAN: 'CANADIAN',
    AUS: 'AUSTRALIAN',
    IND: 'INDIAN',
    DEU: 'GERMAN',
    FRA: 'FRENCH',
    JPN: 'JAPANESE',
    KOR: 'KOREAN',
    BRA: 'BRAZILIAN',
    MEX: 'MEXICAN',
    ITA: 'ITALIAN',
    ESP: 'SPANISH',
    NLD: 'DUTCH',
    PRT: 'PORTUGUESE',
    CHN: 'CHINESE',
    RUS: 'RUSSIAN',
    KEN: 'KENYAN',
    NGA: 'NIGERIAN',
    ZAF: 'SOUTH AFRICAN',
    SGP: 'SINGAPOREAN',
    MYS: 'MALAYSIAN',
    PHL: 'PHILIPPINE',
    IDN: 'INDONESIAN',
    THA: 'THAI',
    VNM: 'VIETNAMESE',
    ARE: 'UAE',
    SAU: 'SAUDI',
    EGY: 'EGYPTIAN',
    TUR: 'TURKISH',
    POL: 'POLISH',
    SWE: 'SWEDISH',
    NOR: 'NORWEGIAN',
    DNK: 'DANISH',
    FIN: 'FINNISH',
    CHE: 'SWISS',
    AUT: 'AUSTRIAN',
    BEL: 'BELGIAN',
    IRL: 'IRISH',
    NZL: 'NEW ZEALAND',
    ARG: 'ARGENTINE',
    COL: 'COLOMBIAN',
    PER: 'PERUVIAN',
    CHL: 'CHILEAN',
  };

  return demonyms[countryCode] || name.toUpperCase();
}

/**
 * KYC document card - matches IdCard design exactly but shows "STANDARD" badge.
 * Used for documents verified through Sumsub KYC flow (drivers license, etc.).
 */
const KycIdCard: FC<KycIdCardProps> = ({
  idDocument,
  selected,
  hidden: _hidden,
}) => {
  // Extract KYC fields from serialized applicant info
  const applicantInfo = deserializeApplicantInfo(
    idDocument.serializedApplicantInfo,
  );
  const country = applicantInfo.country || '';
  const idType = applicantInfo.idType || '';
  const idNumber = applicantInfo.idNumber || '';

  const docTitle = getKycDocTitle(idType);
  const countryAdj = getCountryAdjective(country);

  const { width: screenWidth } = Dimensions.get('window');

  // Card dimensions (matching IdCard: 353x224 for expanded, 353x67 for header only)
  const cardWidth = screenWidth * 0.95 - 16;
  const cardHeight = selected ? cardWidth * 0.635 : cardWidth * 0.19;
  const borderRadius = 12;
  const padding = cardWidth * 0.04;

  // Figma exact dimensions (scaled from 353px reference width)
  const scale = cardWidth / 353;
  const headerHeight = 67 * scale;
  const figmaPadding = 14 * scale;
  const logoCircleSize = 32 * scale;
  const logoIconSize = 32 * scale;
  const headerGap = 12 * scale;

  // Get truncated ID for display (e.g., "0xD123..345")
  const getTruncatedId = (): string => {
    if (idNumber && idNumber.length > 10) {
      return `0x${idNumber.slice(0, 4)}..${idNumber.slice(-3)}`;
    }
    return idNumber ? `0x${idNumber}` : '';
  };

  const truncatedId = getTruncatedId();

  // Header title (e.g., "DRIVERS LICENSE")
  const headerTitle = docTitle;

  // Subtitle text (e.g., "VERIFIED US DRIVERS LICENSE")
  const subtitleText = `VERIFIED ${countryAdj} ${docTitle}`;

  // Bottom label (e.g., "US DRIVERS LICENSE")
  const bottomLabel = `${countryAdj} ${docTitle}`;

  // Font sizes (matching IdCard exactly)
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
        {/* Header Section - Dark gradient (same as IdCard) */}
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
              {/* Country flag */}
              <RoundFlag countryCode={country} size={logoCircleSize} />

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

            {/* Self logo on right */}
            <SvgXml
              xml={selfLogoSvg}
              width={logoIconSize}
              height={logoIconSize}
            />
          </XStack>
        </LinearGradient>

        {/* Body Section - Colorful wave pattern (same as IdCard real documents) */}
        {selected && (
          <YStack style={styles.body}>
            {/* Pre-composited background image (colorful gradient + chrome wave) */}
            <Image
              source={CardBackgroundId1}
              style={styles.backgroundImage}
              resizeMode="cover"
            />

            {/* Bottom content: Left text + Right badge */}
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

              {/* STANDARD Badge - KYC documents always show STANDARD */}
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
                  STANDARD
                </Text>
              </YStack>
            </XStack>
          </YStack>
        )}
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

export default KycIdCard;
