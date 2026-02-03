// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { deserializeApplicantInfo } from '@selfxyz/common';
import { commonNames } from '@selfxyz/common/constants/countries';
import type { KycData } from '@selfxyz/common/utils/types';
import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot, plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import CardWavePattern from '@/assets/images/card_style_1.svg';
import { SvgXml } from '@/components/homescreen/SvgXmlWrapper';

// Self logo SVG (white version, same as in IdCard.tsx)
const logoSvg = `<svg width="18" height="18" viewBox="0 0 47 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.7814 13.2168C12.7814 12.7057 13.1992 12.2969 13.7214 12.2969H30.0017L42.5676 0H11.2408L0 11.0001V29.0973H12.7814V13.2104V13.2168Z" fill="white"/>
<path d="M34.2186 16.8515V32.3552C34.2186 32.8663 33.8008 33.2751 33.2786 33.2751H17.4357L4.43236 46H35.7592L47 34.9999V16.8579H34.2186V16.8515Z" fill="white"/>
<path d="M28.9703 17.6525H18.0362V28.3539H28.9703V17.6525Z" fill="#00FFB6"/>
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
 * Derives a demonym-like adjective from the country name for the subtitle.
 * e.g., "Canada" → "CANADIAN", "United States of America" → "US"
 * Falls back to the 3-letter country code if no mapping found.
 */
function getCountryAdjective(countryCode: string): string {
  const name = commonNames[countryCode as keyof typeof commonNames];
  if (!name) return countryCode;

  // Common demonym overrides
  const demonyms: Record<string, string> = {
    USA: 'US',
    GBR: 'UK',
    CAN: 'CANADIAN',
    AUS: 'AUSTRALIAN',
    IND: 'INDIAN',
    DEU: 'GERMAN',
    'D<<': 'GERMAN',
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

const KycIdCard: FC<KycIdCardProps> = ({ idDocument, selected, hidden }) => {
  // Extract KYC fields from serialized applicant info
  const applicantInfo = deserializeApplicantInfo(
    idDocument.serializedApplicantInfo,
  );
  const country = applicantInfo.country || '';
  const idType = applicantInfo.idType || '';

  const docTitle = getKycDocTitle(idType);
  const countryAdj = getCountryAdjective(country);
  const alpha2 = country.slice(0, 2).toUpperCase();

  // Adaptive sizing (same approach as IdCard.tsx)
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth * 0.95 - 16;
  const headerHeight = cardWidth * 0.19; // ~67px at 353px width
  const cardHeight = selected ? cardWidth * 0.645 : headerHeight;
  const borderRadius = cardWidth * 0.034; // 12px at 353px
  const padding = cardWidth * 0.04; // 14px at 353px

  const fontSize = {
    title: cardWidth * 0.057, // 20px at 353px
    subtitle: cardWidth * 0.02, // 7px at 353px
    badge: cardWidth * 0.028, // 10px at 353px
    address: cardWidth * 0.028, // 10px at 353px
    docName: cardWidth * 0.043, // 15px at 353px
  };

  const flagSize = cardWidth * 0.09; // ~32px at 353px

  return (
    <YStack width="100%" alignItems="center" justifyContent="center">
      <YStack
        width={cardWidth}
        height={cardHeight}
        borderRadius={borderRadius}
        overflow="hidden"
        shadowColor={black}
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.25}
        shadowRadius={14}
        elevation={8}
        marginBottom={8}
      >
        {/* Header — gradient bar with flag, title, Self logo */}
        <LinearGradient
          colors={['#000000', '#343434']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.3 }}
          style={[styles.header, { height: headerHeight, padding: padding }]}
        >
          <XStack flex={1} alignItems="center" gap={padding * 0.85}>
            {/* Country flag */}
            <RoundFlag countryCode={country} size={flagSize} />

            {/* Title + subtitle */}
            <YStack flex={1} gap={2}>
              <Text
                fontFamily={dinot}
                fontSize={fontSize.title}
                color={white}
                numberOfLines={1}
                style={{
                  textTransform: 'uppercase',
                  lineHeight: fontSize.title * 1.1,
                }}
              >
                {alpha2} {docTitle}
              </Text>
              <Text
                fontFamily={dinot}
                fontSize={fontSize.subtitle}
                color="#9193A2"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: fontSize.subtitle * 0.1,
                }}
              >
                VERIFIED {countryAdj} {docTitle}
              </Text>
            </YStack>

            {/* Self logo */}
            <SvgXml
              xml={logoSvg}
              width={flagSize * 0.56}
              height={flagSize * 0.56}
            />
          </XStack>
        </LinearGradient>

        {/* Body — wave pattern on gradient, only shown when expanded */}
        {selected && (
          <LinearGradient
            colors={['#343434', '#000000']}
            start={{ x: 0.8, y: 0 }}
            end={{ x: 0.2, y: 1 }}
            style={[styles.body, { flex: 1 }]}
          >
            {/* Wave pattern background overlay */}
            <YStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              opacity={hidden ? 0.3 : 1}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              style={{ mixBlendMode: 'screen' } as any}
            >
              <CardWavePattern
                width={cardWidth * 1.85}
                height={cardWidth * 1.1}
                style={styles.wavePattern}
              />
            </YStack>

            {/* "STANDARD" badge — bottom right of body */}
            <XStack
              position="absolute"
              right={padding * 0.7}
              bottom={padding}
              backgroundColor="rgba(0,0,0,0.5)"
              borderRadius={30}
              paddingHorizontal={padding * 0.57}
              paddingVertical={padding * 0.28}
              alignItems="center"
            >
              <Text
                fontFamily={dinot}
                fontSize={fontSize.badge}
                color={white}
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: fontSize.badge * 0.06,
                }}
              >
                STANDARD
              </Text>
            </XStack>

            {/* Bottom-left text overlay: address hash + doc name */}
            <YStack position="absolute" left={padding} bottom={padding} gap={4}>
              <Text
                fontFamily={plexMono}
                fontSize={fontSize.address}
                color={white}
              >
                {hidden
                  ? 'XXXXXXXXXX'
                  : `0x${(applicantInfo.idNumber || '').slice(0, 4)}..${(applicantInfo.idNumber || '').slice(-3)}`}
              </Text>
              <Text
                fontFamily={dinot}
                fontSize={fontSize.docName}
                color={white}
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: fontSize.docName * 0.04,
                }}
              >
                {countryAdj} {docTitle}
              </Text>
            </YStack>
          </LinearGradient>
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
    position: 'relative',
    overflow: 'hidden',
  },
  wavePattern: {
    position: 'absolute',
    top: -40,
    left: -20,
  },
});

export default KycIdCard;
