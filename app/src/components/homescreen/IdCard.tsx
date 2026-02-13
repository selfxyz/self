// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { type FC, useCallback } from 'react';
import { Dimensions, Image, Pressable, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Separator, Text, XStack, YStack } from 'tamagui';
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
import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  red600,
  slate100,
  slate300,
  slate400,
  slate500,
  white,
  yellow500,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot, plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import AadhaarIcon from '@selfxyz/mobile-sdk-alpha/svgs/icons/aadhaar.svg';
import EPassport from '@selfxyz/mobile-sdk-alpha/svgs/icons/epassport.svg';

import CardBackgroundId1 from '@/assets/images/card_background_id1.png';
import CardBackgroundId2 from '@/assets/images/card_background_id2.png';
import CardBackgroundId3 from '@/assets/images/card_background_id3.png';
import CardBackgroundId4 from '@/assets/images/card_background_id4.png';
import CardBackgroundId5 from '@/assets/images/card_background_id5.png';
import CardBackgroundId6 from '@/assets/images/card_background_id6.png';
import DevCardLogo from '@/assets/images/dev_card_logo.svg';
import DevCardWave from '@/assets/images/dev_card_wave.svg';
import LogoGray from '@/assets/images/logo_gray.svg';
import SelfLogoPending from '@/assets/images/self_logo_pending.svg';
import WaveOverlay from '@/assets/images/wave_overlay.png';
import { getSecurityLevel } from '@/components/homescreen/cardSecurityBadge';
import { cardStyles } from '@/components/homescreen/cardStyles';
import KycIdCard from '@/components/homescreen/KycIdCard';
import { SvgXml } from '@/components/homescreen/SvgXmlWrapper';
import { useCardDimensions } from '@/hooks/useCardDimensions';
import { getBackgroundIndex } from '@/utils/cardBackgroundSelector';
import {
  formatDateFromYYMMDD,
  getDocumentAttributes,
  getNameAndSurname,
} from '@/utils/documentAttributes';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';

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
 * Note: D<< (German passports) should be normalized to DEU before calling this.
 */
const getCountryDemonym = (code: string): string => {
  if (!code) return '';
  const upperCode = code.toUpperCase().replace(/</g, '').trim();
  if (!upperCode) return '';
  // Fallback for any remaining special codes with <
  if (code.includes('<')) {
    return COUNTRY_DEMONYMS['D<<'] || 'GERMAN';
  }
  return COUNTRY_DEMONYMS[upperCode] || upperCode;
};

const logoSvg = `<svg width="47" height="46" viewBox="0 0 47 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.7814 13.2168C12.7814 12.7057 13.1992 12.2969 13.7214 12.2969H30.0017L42.5676 0H11.2408L0 11.0001V29.0973H12.7814V13.2104V13.2168Z" fill="white"/>
<path d="M34.2186 16.8515V32.3552C34.2186 32.8663 33.8008 33.2751 33.2786 33.2751H17.4357L4.43236 46H35.7592L47 34.9999V16.8579H34.2186V16.8515Z" fill="white"/>
<path d="M28.9703 17.6525H18.0362V28.3539H28.9703V17.6525Z" fill="#00FFB6"/>
</svg>`;

interface IdCardLayoutAttributes {
  idDocument: PassportData | AadhaarData | KycData | null;
  selected: boolean;
  hidden: boolean;
  isInactive?: boolean;
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
}) => {
  const navigation = useNavigation();
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
    const { width: screenWidth } = Dimensions.get('window');
    const revealedWidth = screenWidth * 0.95 - 16;
    const revealedHeight = revealedWidth * 0.645;
    const revealedBorderRadius = revealedWidth * 0.04;
    const revealedPadding = revealedWidth * 0.035;
    const revealedFontSize = {
      large: revealedWidth * 0.045,
      small: revealedWidth * 0.028,
      xsmall: revealedWidth * 0.022,
    };
    const imageSize = {
      width: revealedWidth * 0.2,
      height: revealedWidth * 0.29,
    };
    const contentLeftOffset = imageSize.width + revealedPadding;
    const docAttributes = getDocumentAttributes(idDocument);
    const nameData = getNameAndSurname(docAttributes.nameSlice);

    return (
      <YStack width="100%" alignItems="center" justifyContent="center">
        <YStack
          width={revealedWidth}
          height={revealedHeight}
          backgroundColor={white}
          borderRadius={revealedBorderRadius}
          borderWidth={0.75}
          borderColor={'#E0E0E0'}
          padding={revealedPadding}
          shadowColor={black}
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.1}
          shadowRadius={4}
          elevation={4}
          marginBottom={8}
          justifyContent="center"
        >
          {/* Header Section */}
          <XStack>
            <XStack alignItems="center">
              {isAadhaarDocument(idDocument) ? (
                <AadhaarIcon
                  width={revealedFontSize.large * 3}
                  height={revealedFontSize.large * 3 * 0.617}
                />
              ) : (
                <EPassport
                  width={revealedFontSize.large * 3}
                  height={revealedFontSize.large * 3 * 0.617}
                />
              )}
              <YStack marginLeft={imageSize.width - revealedFontSize.large * 3}>
                <Text
                  fontWeight="bold"
                  fontFamily={dinot}
                  fontSize={revealedFontSize.large * 1.4}
                  color="black"
                >
                  {isMRZDocument(idDocument) &&
                  idDocument.documentCategory === 'passport'
                    ? 'Passport'
                    : isAadhaarDocument(idDocument)
                      ? 'Aadhaar'
                      : 'ID Card'}
                </Text>
                <Text
                  fontSize={revealedFontSize.small}
                  color={slate400}
                  fontFamily={dinot}
                >
                  Verified{' '}
                  {isMRZDocument(idDocument) &&
                  idDocument.documentCategory === 'passport'
                    ? 'Biometric Passport'
                    : isAadhaarDocument(idDocument)
                      ? 'Aadhaar Document'
                      : 'Biometric ID Card'}
                </Text>
              </YStack>
            </XStack>
            <XStack flex={1} justifyContent="flex-end">
              {idDocument.mock && (
                <YStack
                  marginTop={revealedPadding / 4}
                  borderWidth={1}
                  borderColor={slate300}
                  borderRadius={100}
                  paddingHorizontal={revealedPadding / 2}
                  alignSelf="flex-start"
                  backgroundColor={slate100}
                  paddingVertical={revealedPadding / 8}
                >
                  <Text
                    fontSize={revealedFontSize.xsmall}
                    color={slate400}
                    fontFamily={dinot}
                    letterSpacing={revealedFontSize.xsmall * 0.15}
                  >
                    DEVELOPER
                  </Text>
                </YStack>
              )}
            </XStack>
          </XStack>

          <Separator
            backgroundColor={'#E0E0E0'}
            height={1}
            width={revealedWidth - 1}
            marginLeft={-revealedPadding}
            marginTop={revealedPadding}
          />

          {/* Main Content Section */}
          <XStack height="60%" paddingVertical={revealedPadding}>
            {/* Person Image Placeholder */}
            <YStack
              width={imageSize.width}
              height={imageSize.height}
              backgroundColor="#F5F5F5"
              borderRadius={revealedBorderRadius * 0.5}
              justifyContent="center"
              alignItems="center"
              marginRight={revealedPadding}
            >
              <SvgXml
                xml={logoSvg}
                width={imageSize.width * 0.6}
                height={imageSize.height * 0.6}
              />
            </YStack>

            {/* ID Attributes Grid */}
            <YStack
              flex={1}
              justifyContent="space-between"
              height={imageSize.height}
            >
              <XStack flex={1} gap={revealedPadding * 0.3}>
                <YStack flex={1}>
                  <IdAttribute
                    name="TYPE"
                    value={
                      isMRZDocument(idDocument) &&
                      idDocument.documentCategory === 'passport'
                        ? 'PASSPORT'
                        : isAadhaarDocument(idDocument)
                          ? 'AADHAAR'
                          : 'ID CARD'
                    }
                  />
                </YStack>
                <YStack flex={1}>
                  <IdAttribute
                    name="CODE"
                    value={idDocument.mock ? 'SELF DEV' : 'SELF ID'}
                  />
                </YStack>
                <YStack flex={1}>
                  <IdAttribute
                    name="DOC NO."
                    value={docAttributes.passNoSlice}
                  />
                </YStack>
              </XStack>
              <XStack flex={1} gap={revealedPadding * 0.3}>
                {isAadhaarDocument(idDocument) ? (
                  <>
                    <YStack flex={2}>
                      <IdAttribute
                        name="NAME"
                        value={[...nameData.surname, ...nameData.names].join(
                          ' ',
                        )}
                      />
                    </YStack>
                    <YStack flex={1}>
                      <IdAttribute name="SEX" value={docAttributes.sexSlice} />
                    </YStack>
                  </>
                ) : (
                  <>
                    <YStack flex={1}>
                      <IdAttribute
                        name="SURNAME"
                        value={nameData.surname.join(' ')}
                      />
                    </YStack>
                    <YStack flex={1}>
                      <IdAttribute
                        name="NAME"
                        value={nameData.names.join(' ')}
                      />
                    </YStack>
                    <YStack flex={1}>
                      <IdAttribute name="SEX" value={docAttributes.sexSlice} />
                    </YStack>
                  </>
                )}
              </XStack>
              <XStack flex={1} gap={revealedPadding * 0.3}>
                <YStack flex={1}>
                  <IdAttribute
                    name="NATIONALITY"
                    value={docAttributes.nationalitySlice}
                  />
                </YStack>
                <YStack flex={1}>
                  <IdAttribute
                    name="DOB"
                    value={formatDateFromYYMMDD(docAttributes.dobSlice, true)}
                  />
                </YStack>
                <YStack flex={1}>
                  <IdAttribute
                    name="EXPIRY DATE"
                    value={formatDateFromYYMMDD(docAttributes.expiryDateSlice)}
                  />
                </YStack>
              </XStack>
              <XStack flex={1} gap={revealedPadding * 0.3}>
                <YStack flex={1}>
                  <IdAttribute
                    name="AUTHORITY"
                    value={docAttributes.issuingStateSlice}
                  />
                </YStack>
                <YStack flex={1} />
                <YStack flex={1} />
              </XStack>
            </YStack>
          </XStack>

          {/* Footer Section - MRZ */}
          {isMRZDocument(idDocument) && idDocument.mrz && (
            <XStack
              alignItems="center"
              backgroundColor={slate100}
              borderRadius={revealedBorderRadius / 3}
              paddingHorizontal={revealedPadding / 2}
              paddingVertical={revealedPadding / 4}
            >
              <XStack width={contentLeftOffset} alignItems="center">
                <LogoGray
                  width={revealedFontSize.large}
                  height={revealedFontSize.large}
                />
              </XStack>
              <YStack marginLeft={-revealedPadding / 2}>
                {idDocument.documentCategory === 'passport' ? (
                  <>
                    <Text
                      fontSize={revealedFontSize.xsmall}
                      letterSpacing={revealedFontSize.xsmall * 0.1}
                      fontFamily={plexMono}
                      color={slate400}
                    >
                      {idDocument.mrz.slice(0, 44)}
                    </Text>
                    <Text
                      fontSize={revealedFontSize.xsmall}
                      letterSpacing={revealedFontSize.xsmall * 0.1}
                      fontFamily={plexMono}
                      color={slate400}
                    >
                      {idDocument.mrz.slice(44, 88)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      fontSize={revealedFontSize.xsmall}
                      letterSpacing={revealedFontSize.xsmall * 0.44}
                      fontFamily={plexMono}
                      color={slate400}
                    >
                      {idDocument.mrz.slice(0, 30)}
                    </Text>
                    <Text
                      fontSize={revealedFontSize.xsmall}
                      letterSpacing={revealedFontSize.xsmall * 0.44}
                      fontFamily={plexMono}
                      color={slate400}
                    >
                      {idDocument.mrz.slice(30, 60)}
                    </Text>
                    <Text
                      fontSize={revealedFontSize.xsmall}
                      letterSpacing={revealedFontSize.xsmall * 0.44}
                      fontFamily={plexMono}
                      color={slate400}
                    >
                      {idDocument.mrz.slice(60, 90)}
                    </Text>
                  </>
                )}
              </YStack>
            </XStack>
          )}

          {/* Footer Section - Empty placeholder for Aadhaar */}
          {isAadhaarDocument(idDocument) && (
            <XStack
              alignItems="center"
              backgroundColor={slate100}
              borderRadius={revealedBorderRadius / 3}
              paddingHorizontal={revealedPadding / 2}
              paddingVertical={revealedPadding / 4}
              minHeight={revealedFontSize.xsmall * 2.5}
            >
              <XStack width={contentLeftOffset} alignItems="center">
                <LogoGray
                  width={revealedFontSize.large}
                  height={revealedFontSize.large}
                />
              </XStack>
            </XStack>
          )}
        </YStack>
      </YStack>
    );
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
        height={cardHeight}
        borderRadius={borderRadius}
        overflow="hidden"
        backgroundColor="#000000"
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.25}
        shadowRadius={14}
        elevation={8}
        marginBottom={8}
        alignItems="stretch"
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
              paddingHorizontal: figmaPadding,
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
                // Real document: Country flag
                <RoundFlag countryCode={nationalityCode} size={logoSize} />
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
              <SelfLogoPending width={logoSize} height={logoSize} />
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

                {/* Bottom Right: Badges */}
                <YStack alignItems="flex-end" gap={4}>
                  {isInactive && (
                    <YStack
                      backgroundColor={red600}
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
                        INACTIVE
                      </Text>
                    </YStack>
                  )}
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
    width: '100%',
  },
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

interface IdAttributeProps {
  name: string;
  value: string;
}

const IdAttribute: FC<IdAttributeProps> = ({ name, value }) => {
  const { width: screenWidth } = Dimensions.get('window');
  const attrFontSize = {
    label: screenWidth * 0.024,
    value: screenWidth * 0.02,
  };

  return (
    <YStack>
      <Text
        fontWeight="bold"
        fontSize={attrFontSize.label}
        color={slate500}
        fontFamily={dinot}
      >
        {name}
      </Text>
      <Text fontSize={attrFontSize.value} color={slate400} fontFamily={dinot}>
        {value}
      </Text>
    </YStack>
  );
};

export default IdCardLayout;
