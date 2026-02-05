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
import { isAadhaarDocument, isMRZDocument } from '@selfxyz/common/utils/types';
import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import { white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot, plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import CardBackgroundId1 from '@/assets/images/card_background_id1.png';
import CardBackgroundId2 from '@/assets/images/card_background_id2.png';
import CardBackgroundId3 from '@/assets/images/card_background_id3.png';
import CardBackgroundId4 from '@/assets/images/card_background_id4.png';
import CardBackgroundId5 from '@/assets/images/card_background_id5.png';
import CardBackgroundId6 from '@/assets/images/card_background_id6.png';
import DevCardLogo from '@/assets/images/dev_card_logo.svg';
import DevCardWave from '@/assets/images/dev_card_wave.svg';
import WaveOverlay from '@/assets/images/wave_overlay.png';
import { SvgXml } from '@/components/homescreen/SvgXmlWrapper';
import { getBackgroundIndex } from '@/utils/cardBackgroundSelector';
import { getDocumentAttributes } from '@/utils/documentAttributes';

const CARD_BACKGROUNDS = [
  CardBackgroundId1,
  CardBackgroundId2,
  CardBackgroundId3,
  CardBackgroundId4,
  CardBackgroundId5,
  CardBackgroundId6,
];

import { getSecurityLevel } from './cardSecurityBadge';

// Self logo SVG (white version for header right on real documents)
const selfLogoSvg = `<svg width="47" height="46" viewBox="0 0 47 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.7814 13.2168C12.7814 12.7057 13.1992 12.2969 13.7214 12.2969H30.0017L42.5676 0H11.2408L0 11.0001V29.0973H12.7814V13.2104V13.2168Z" fill="white"/>
<path d="M34.2186 16.8515V32.3552C34.2186 32.8663 33.8008 33.2751 33.2786 33.2751H17.4357L4.43236 46H35.7592L47 34.9999V16.8579H34.2186V16.8515Z" fill="white"/>
<path d="M28.9703 17.6525H18.0362V28.3539H28.9703V17.6525Z" fill="white"/>
</svg>`;

// Design tokens from Figma
const DEV_LOGO_BG = '#52525B'; // zinc/600 - grey circle background for dev logo
const DEV_BODY_COLOR = '#1E1B4B'; // indigo/950 - dev card body background

// Country code to demonym mapping - comprehensive list for all supported countries
const COUNTRY_DEMONYMS: Record<string, string> = {
  // Major countries
  USA: 'AMERICAN',
  GBR: 'BRITISH',
  JPN: 'JAPANESE',
  DEU: 'GERMAN',
  'D<<': 'GERMAN', // German passports use D<<
  FRA: 'FRENCH',
  CAN: 'CANADIAN',
  IND: 'INDIAN',
  AUS: 'AUSTRALIAN',
  NGA: 'NIGERIAN',
  FIN: 'FINNISH',
  ITA: 'ITALIAN',
  ESP: 'SPANISH',
  BRA: 'BRAZILIAN',
  MEX: 'MEXICAN',
  CHN: 'CHINESE',
  KOR: 'SOUTH KOREAN',
  PRK: 'NORTH KOREAN',
  NLD: 'DUTCH',
  SWE: 'SWEDISH',
  NOR: 'NORWEGIAN',
  DNK: 'DANISH',
  CHE: 'SWISS',
  AUT: 'AUSTRIAN',
  BEL: 'BELGIAN',
  PRT: 'PORTUGUESE',
  GRC: 'GREEK',
  POL: 'POLISH',
  IRL: 'IRISH',
  NZL: 'NEW ZEALANDER',
  ZAF: 'SOUTH AFRICAN',
  SGP: 'SINGAPOREAN',
  MYS: 'MALAYSIAN',
  THA: 'THAI',
  PHL: 'FILIPINO',
  IDN: 'INDONESIAN',
  VNM: 'VIETNAMESE',
  ARE: 'EMIRATI',
  SAU: 'SAUDI',
  ISR: 'ISRAELI',
  EGY: 'EGYPTIAN',
  TUR: 'TURKISH',
  RUS: 'RUSSIAN',
  UKR: 'UKRAINIAN',
  ARG: 'ARGENTINIAN',
  COL: 'COLOMBIAN',
  CHL: 'CHILEAN',
  PER: 'PERUVIAN',
  // Europe
  ALB: 'ALBANIAN',
  AND: 'ANDORRAN',
  ARM: 'ARMENIAN',
  AZE: 'AZERBAIJANI',
  BLR: 'BELARUSIAN',
  BIH: 'BOSNIAN',
  BGR: 'BULGARIAN',
  HRV: 'CROATIAN',
  CYP: 'CYPRIOT',
  CZE: 'CZECH',
  EST: 'ESTONIAN',
  GEO: 'GEORGIAN',
  HUN: 'HUNGARIAN',
  ISL: 'ICELANDIC',
  LVA: 'LATVIAN',
  LIE: 'LIECHTENSTEINER',
  LTU: 'LITHUANIAN',
  LUX: 'LUXEMBOURGISH',
  MLT: 'MALTESE',
  MDA: 'MOLDOVAN',
  MCO: 'MONACAN',
  MNE: 'MONTENEGRIN',
  MKD: 'MACEDONIAN',
  ROU: 'ROMANIAN',
  SMR: 'SAMMARINESE',
  SRB: 'SERBIAN',
  SVK: 'SLOVAK',
  SVN: 'SLOVENIAN',
  VAT: 'VATICAN',
  // Americas
  ATG: 'ANTIGUAN',
  BHS: 'BAHAMIAN',
  BRB: 'BARBADIAN',
  BLZ: 'BELIZEAN',
  BOL: 'BOLIVIAN',
  CRI: 'COSTA RICAN',
  CUB: 'CUBAN',
  DMA: 'DOMINICAN',
  DOM: 'DOMINICAN',
  ECU: 'ECUADORIAN',
  SLV: 'SALVADORAN',
  GRD: 'GRENADIAN',
  GTM: 'GUATEMALAN',
  GUY: 'GUYANESE',
  HTI: 'HAITIAN',
  HND: 'HONDURAN',
  JAM: 'JAMAICAN',
  NIC: 'NICARAGUAN',
  PAN: 'PANAMANIAN',
  PRY: 'PARAGUAYAN',
  KNA: 'KITTITIAN',
  LCA: 'SAINT LUCIAN',
  VCT: 'VINCENTIAN',
  SUR: 'SURINAMESE',
  TTO: 'TRINIDADIAN',
  URY: 'URUGUAYAN',
  VEN: 'VENEZUELAN',
  // Africa
  DZA: 'ALGERIAN',
  AGO: 'ANGOLAN',
  BEN: 'BENINESE',
  BWA: 'BOTSWANAN',
  BFA: 'BURKINABE',
  BDI: 'BURUNDIAN',
  CPV: 'CAPE VERDEAN',
  CMR: 'CAMEROONIAN',
  CAF: 'CENTRAL AFRICAN',
  TCD: 'CHADIAN',
  COM: 'COMORIAN',
  COG: 'CONGOLESE',
  COD: 'CONGOLESE',
  CIV: 'IVORIAN',
  DJI: 'DJIBOUTIAN',
  GNQ: 'EQUATOGUINEAN',
  ERI: 'ERITREAN',
  SWZ: 'SWAZI',
  ETH: 'ETHIOPIAN',
  GAB: 'GABONESE',
  GMB: 'GAMBIAN',
  GHA: 'GHANAIAN',
  GIN: 'GUINEAN',
  GNB: 'BISSAU-GUINEAN',
  KEN: 'KENYAN',
  LSO: 'BASOTHO',
  LBR: 'LIBERIAN',
  LBY: 'LIBYAN',
  MDG: 'MALAGASY',
  MWI: 'MALAWIAN',
  MLI: 'MALIAN',
  MRT: 'MAURITANIAN',
  MUS: 'MAURITIAN',
  MAR: 'MOROCCAN',
  MOZ: 'MOZAMBICAN',
  NAM: 'NAMIBIAN',
  NER: 'NIGERIEN',
  RWA: 'RWANDAN',
  STP: 'SAO TOMEAN',
  SEN: 'SENEGALESE',
  SYC: 'SEYCHELLOIS',
  SLE: 'SIERRA LEONEAN',
  SOM: 'SOMALI',
  SSD: 'SOUTH SUDANESE',
  SDN: 'SUDANESE',
  TZA: 'TANZANIAN',
  TGO: 'TOGOLESE',
  TUN: 'TUNISIAN',
  UGA: 'UGANDAN',
  ZMB: 'ZAMBIAN',
  ZWE: 'ZIMBABWEAN',
  // Asia & Middle East
  AFG: 'AFGHAN',
  BHR: 'BAHRAINI',
  BGD: 'BANGLADESHI',
  BTN: 'BHUTANESE',
  BRN: 'BRUNEIAN',
  KHM: 'CAMBODIAN',
  TWN: 'TAIWANESE',
  HKG: 'HONG KONGER',
  IRQ: 'IRAQI',
  IRN: 'IRANIAN',
  JOR: 'JORDANIAN',
  KAZ: 'KAZAKHSTANI',
  KWT: 'KUWAITI',
  KGZ: 'KYRGYZSTANI',
  LAO: 'LAOTIAN',
  LBN: 'LEBANESE',
  MAC: 'MACANESE',
  MDV: 'MALDIVIAN',
  MNG: 'MONGOLIAN',
  MMR: 'MYANMAR',
  NPL: 'NEPALI',
  OMN: 'OMANI',
  PAK: 'PAKISTANI',
  PSE: 'PALESTINIAN',
  QAT: 'QATARI',
  LKA: 'SRI LANKAN',
  SYR: 'SYRIAN',
  TJK: 'TAJIKISTANI',
  TKM: 'TURKMEN',
  UZB: 'UZBEKISTANI',
  YEM: 'YEMENI',
  // Oceania
  FJI: 'FIJIAN',
  KIR: 'I-KIRIBATI',
  MHL: 'MARSHALLESE',
  FSM: 'MICRONESIAN',
  NRU: 'NAURUAN',
  PLW: 'PALAUAN',
  PNG: 'PAPUA NEW GUINEAN',
  WSM: 'SAMOAN',
  SLB: 'SOLOMON ISLANDER',
  TON: 'TONGAN',
  TUV: 'TUVALUAN',
  VUT: 'NI-VANUATU',
  TLS: 'TIMORESE',
};

/**
 * Get country demonym from 3-letter country code.
 * Falls back to the code itself if no mapping exists.
 */
const getCountryDemonym = (code: string): string => {
  const upperCode = code.toUpperCase().replace(/</g, '').trim();
  // Check for D<< (German passport code) first
  if (code.includes('<')) {
    return COUNTRY_DEMONYMS['D<<'] || 'GERMAN';
  }
  return COUNTRY_DEMONYMS[upperCode] || upperCode;
};

interface IdCardLayoutAttributes {
  idDocument: PassportData | AadhaarData | null;
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
  hidden: _hidden,
}) => {
  if (!idDocument) {
    return null;
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
  const countryDemonym = getCountryDemonym(nationalityCode);

  // Get deterministic background based on document data
  const backgroundIndex = getBackgroundIndex(idDocument);
  const cardBackground = CARD_BACKGROUNDS[backgroundIndex - 1];


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

  // Subtitle text (uses demonym: "VERIFIED AMERICAN PASSPORT")
  const subtitleText = isMockDocument
    ? `SELF DEVELOPER ${getDocumentTypeLabel()}`
    : `VERIFIED ${countryDemonym} ${getDocumentTypeLabel()}`;

  // Bottom label (uses demonym: "AMERICAN PASSPORT")
  const bottomLabel = `${countryDemonym} ${getDocumentTypeLabel()}`;

  // Figma exact dimensions (scaled from 353px reference width)
  const scale = cardWidth / 353;
  const headerHeight = 67 * scale;
  const bodyHeight = 157 * scale;
  const figmaPadding = 14 * scale;
  const logoCircleSize = 32 * scale;
  const logoIconSize = 32 * scale;
  const headerGap = 12 * scale;

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
            // Real document body - gradient background with wave overlay
            <YStack style={styles.body}>
              {/* Gradient background */}
              <Image
                source={cardBackground}
                style={styles.backgroundImage}
                resizeMode="cover"
              />
              {/* Wave pattern overlay */}
              <Image
                source={WaveOverlay}
                style={styles.waveOverlay}
                resizeMode="contain"
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
  waveOverlay: {
    position: 'absolute',
    top: -10,
    left: 0,
    width: '100%',
    height: '90%',
    opacity: 0.6,
  },
});

export default IdCardLayout;
