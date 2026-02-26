// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Image } from 'react-native';
import { YStack } from 'tamagui';

import { deserializeApplicantInfo } from '@selfxyz/common';
import { commonNames } from '@selfxyz/common/constants/countries';
import type { KycData } from '@selfxyz/common/utils/types';
import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import CardBackgroundId1 from '@/assets/images/card_background_id1.png';
import SelfLogoPending from '@/assets/images/self_logo_pending.svg';
import CardBottomContent from '@/components/homescreen/CardBottomContent';
import CardHeader from '@/components/homescreen/CardHeader';
import { cardStyles } from '@/components/homescreen/cardStyles';
import { useCardDimensions } from '@/hooks/useCardDimensions';
import { getCountryAdjective } from '@/utils/countryDemonyms';

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
 * KYC document card - matches IdCard design exactly but shows "STANDARD" badge.
 * Used for documents verified through Sumsub KYC flow (drivers license, etc.).
 */
const KycIdCard: FC<KycIdCardProps> = ({
  idDocument,
  selected,
  hidden: _hidden,
}) => {
  // Extract KYC fields from serialized applicant info with error handling
  let country = '';
  let idType = '';
  let idNumber = '';

  try {
    const applicantInfo = deserializeApplicantInfo(
      idDocument.serializedApplicantInfo,
    );
    country = applicantInfo.country || '';
    idType = applicantInfo.idType || '';
    idNumber = applicantInfo.idNumber || '';
  } catch (error) {
    console.error(
      '[KycIdCard] Failed to deserialize applicant info, using fallback values:',
      error,
    );
    // Fallback to safe defaults - component will render generic "ID CARD" display
  }

  const docTitle = getKycDocTitle(idType);
  const countryAdj = getCountryAdjective(country, commonNames);

  const {
    cardWidth,
    cardHeight,
    borderRadius,
    headerHeight,
    figmaPadding,
    logoSize,
    headerGap,
    fontSize,
  } = useCardDimensions(selected);
  const padding = cardWidth * 0.04;

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

  return (
    <YStack width="100%" alignItems="center" justifyContent="center">
      <YStack
        width={cardWidth}
        height={cardHeight}
        borderRadius={borderRadius}
        overflow="hidden"
        backgroundColor={black}
        shadowColor={black}
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.25}
        shadowRadius={14}
        elevation={8}
        marginBottom={8}
        alignItems="stretch"
      >
        {/* Header Section - Dark gradient (same as IdCard) */}
        <CardHeader
          variant="gradient"
          title={headerTitle}
          subtitle={subtitleText}
          headerHeight={headerHeight}
          figmaPadding={figmaPadding}
          headerGap={headerGap}
          fontSize={fontSize}
          logo={<RoundFlag countryCode={country} size={logoSize} />}
          rightElement={<SelfLogoPending width={logoSize} height={logoSize} />}
        />

        {/* Body Section - Colorful wave pattern (same as IdCard real documents) */}
        {selected && (
          <YStack style={cardStyles.body}>
            {/* Pre-composited background image (colorful gradient + chrome wave) */}
            <Image
              source={CardBackgroundId1}
              style={cardStyles.backgroundImage}
              resizeMode="cover"
            />

            {/* Bottom content: Left text + Right badge */}
            <CardBottomContent
              truncatedId={truncatedId}
              bottomLabel={bottomLabel}
              badges={[
                {
                  text: 'STANDARD',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  textColor: white,
                },
              ]}
              padding={padding}
              fontSize={fontSize}
            />
          </YStack>
        )}
      </YStack>
    </YStack>
  );
};

export default KycIdCard;
