// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Text, View, XStack, YStack } from 'tamagui';

import { useSelfClient } from '../../providers/SelfClientProvider';

const getDocumentName = (docType: string): string => {
  switch (docType) {
    case 'p':
      return 'Passport';
    case 'i':
      return 'ID Card';
    case 'a':
      return 'Aadhaar';
    case 'kyc':
      return 'Other IDs';
    default:
      return 'Unknown Document';
  }
};

const getDocumentDescription = (docType: string): string => {
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
      return '';
  }
};

const getSecurityBadge = (docType: string): string | null => {
  switch (docType) {
    case 'p':
    case 'i':
    case 'a':
      return 'Best security';
    default:
      return null;
  }
};

const DocumentItem: React.FC<{
  docType: string;
  onPress: () => void;
}> = ({ docType, onPress }) => {
  const badge = getSecurityBadge(docType);
  const description = getDocumentDescription(docType);

  return (
    <XStack
      backgroundColor="#ffffff"
      borderWidth={1}
      borderColor="#CBD5E1"
      borderRadius={12}
      padding={16}
      alignItems="center"
      gap={12}
      pressStyle={{ transform: [{ scale: 0.97 }], backgroundColor: '#F8FAFC' }}
      onPress={onPress}
      cursor="pointer"
      position="relative"
    >
      {badge && (
        <Text
          fontSize={12}
          fontFamily="DINOT-Medium"
          color="#2563EB"
          backgroundColor="#DBEAFE"
          borderRadius={12}
          borderWidth={1}
          borderColor="#2563EB"
          paddingHorizontal={8}
          paddingVertical={4}
          position="absolute"
          top={-14}
          right={-8}
        >
          {badge}
        </Text>
      )}
      <View
        width={48}
        height={48}
        borderRadius={8}
        backgroundColor="#F8FAFC"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={24}>
          {docType === 'p' ? '🛂' : docType === 'i' ? '🪪' : docType === 'a' ? '🆔' : '📄'}
        </Text>
      </View>
      <YStack gap={2}>
        <Text fontFamily="DINOT-Medium" fontSize={24} color="#000000">
          {getDocumentName(docType)}
        </Text>
        {description && (
          <Text fontFamily="DINOT-Medium" fontSize={14} color="#94A3B8">
            {description}
          </Text>
        )}
      </YStack>
    </XStack>
  );
};

export const IDSelectionScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();

  const { countryCode = '', documentTypes = [] } = (location.state as {
    countryCode?: string;
    documentTypes?: string[];
  }) || {};

  const onSelect = useCallback(
    (docType: string) => {
      haptic.trigger('selection');
      analytics.trackEvent('document_type_selected', {
        documentType: docType,
        countryCode,
      });

      if (docType === 'kyc') {
        navigate('/coming-soon', { state: { countryCode, documentCategory: 'kyc' } });
        return;
      }

      // Navigate to camera for MRZ scanning
      navigate('/onboarding/camera', {
        state: { countryCode, documentType: docType },
      });
    },
    [navigate, analytics, haptic, countryCode],
  );

  return (
    <YStack flex={1} backgroundColor="#F8FAFC" paddingHorizontal={16}>
      {/* Header */}
      <XStack paddingTop={16} paddingBottom={8}>
        <Text
          fontFamily="DINOT-Medium"
          fontSize={12}
          letterSpacing={1}
          color="#94A3B8"
          textTransform="uppercase"
        >
          Getting Started
        </Text>
      </XStack>

      {/* Title area */}
      <YStack alignItems="center" paddingTop={24} paddingBottom={32} gap={16}>
        <XStack alignItems="center" gap={10}>
          <View
            width={48}
            height={48}
            borderRadius={24}
            backgroundColor="#E2E8F0"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={20}>{countryCode.slice(0, 2)}</Text>
          </View>
          <Text fontSize={18} color="#94A3B8">+</Text>
          <View
            width={48}
            height={48}
            borderRadius={12}
            backgroundColor="#000000"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={20} color="#ffffff">S</Text>
          </View>
        </XStack>

        <Text fontFamily="Advercase-Regular" fontSize={29} color="#000000" textAlign="center">
          Select an ID type
        </Text>
      </YStack>

      {/* Document type cards */}
      <YStack gap={16}>
        {documentTypes
          .filter((dt: string) => dt !== 'kyc')
          .map((docType: string) => (
            <DocumentItem key={docType} docType={docType} onPress={() => onSelect(docType)} />
          ))}

        <Text
          fontFamily="DINOT-Medium"
          fontSize={18}
          color="#94A3B8"
          textAlign="center"
          paddingVertical={8}
        >
          Be sure your document is ready to scan
        </Text>

        {/* KYC option */}
        <YStack paddingTop={20}>
          <DocumentItem docType="kyc" onPress={() => onSelect('kyc')} />
        </YStack>
      </YStack>
    </YStack>
  );
};
