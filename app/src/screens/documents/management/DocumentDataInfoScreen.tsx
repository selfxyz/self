// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Separator, XStack, YStack } from 'tamagui';
import { useFocusEffect } from '@react-navigation/native';

import type { PassportMetadata } from '@selfxyz/common/types';
import type { AadhaarData } from '@selfxyz/common/utils/types';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { Caption } from '@selfxyz/mobile-sdk-alpha/components';
import { DocumentEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate200,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { usePassport } from '@/providers/passportDataProvider';
import { extraYPadding } from '@/utils/styleUtils';

type DocumentMetadata =
  | (PassportMetadata & { documentCategory: 'passport' | 'id_card' })
  | {
      documentCategory: 'aadhaar';
      documentType: string;
    };

// TODO clarify if we need more/less keys to be displayed
const passportDataKeysToLabels: Record<
  keyof Omit<PassportMetadata, 'countryCode' | 'dsc' | 'csca'>,
  string
> = {
  dataGroups: 'Data Groups',
  dg1Size: 'DG1 Size',
  dg1HashSize: 'DG1 Hash Size',
  dg1HashFunction: 'DG1 Hash Function',
  dg1HashOffset: 'DG1 Hash Offset',
  dgPaddingBytes: 'DG Padding Bytes',
  eContentSize: 'eContent Size',
  eContentHashFunction: 'eContent Hash Function',
  eContentHashOffset: 'eContent Hash Offset',
  signedAttrSize: 'Signed Attributes Size',
  signedAttrHashFunction: 'Signed Attributes Hash Function',
  signatureAlgorithm: 'Signature Algorithm',
  curveOrExponent: 'Curve or Exponent',
  saltLength: 'Salt Length',
  signatureAlgorithmBits: 'Signature Algorithm Bits',
  cscaFound: 'CSCA Found',
  cscaHashFunction: 'CSCA Hash Function',
  cscaSignatureAlgorithm: 'CSCA Signature Algorithm',
  cscaCurveOrExponent: 'CSCA Curve or Exponent',
  cscaSaltLength: 'CSCA Salt Length',
  cscaSignatureAlgorithmBits: 'CSCA Signature Algorithm Bits',
};

const aadhaarDataKeysToLabels: Record<string, string> = {
  documentType: 'Document Type',
  documentCategory: 'Document Category',
};

const InfoRow: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <YStack>
    <XStack paddingVertical="$4" justifyContent="space-between">
      <Caption style={{ fontSize: 16 }}>{label}</Caption>
      <Caption style={{ color: black, fontSize: 16 }}>{value}</Caption>
    </XStack>
    <Separator borderColor={slate200} />
  </YStack>
);

const DocumentDataInfoScreen: React.FC = () => {
  const { trackEvent } = useSelfClient();
  const { getData } = usePassport();
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const { bottom } = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    if (metadata) {
      return;
    }

    const result = await getData();

    if (!result || !result.data) {
      // maybe handle error instead
      return;
    }

    const documentCategory = result.data.documentCategory as
      | 'passport'
      | 'id_card'
      | 'aadhaar';

    if (documentCategory === 'aadhaar') {
      const aadhaarData = result.data as AadhaarData;
      const aadhaarMetadata = {
        documentCategory: aadhaarData.documentCategory,
        documentType: aadhaarData.documentType,
        publicKey: aadhaarData.publicKey,
      } as const;
      setMetadata(aadhaarMetadata);
      trackEvent(DocumentEvents.PASSPORT_METADATA_LOADED, {
        documentType: 'aadhaar',
      });
    } else {
      if (!('passportMetadata' in result.data)) {
        console.warn('DocumentDataInfoScreen: passportMetadata is missing');
        return;
      }

      const passportMetadata = result.data.passportMetadata;
      const passportMetadataWithCategory = {
        ...passportMetadata,
        documentCategory,
      } as PassportMetadata & { documentCategory: 'passport' | 'id_card' };
      setMetadata(passportMetadataWithCategory);
      trackEvent(DocumentEvents.PASSPORT_METADATA_LOADED);
    }
  }, [metadata, getData, trackEvent]);

  useFocusEffect(() => {
    trackEvent(DocumentEvents.PASSPORT_INFO_OPENED);
    loadData();
  });

  const isAadhaarDocument = metadata?.documentCategory === 'aadhaar';
  const dataKeysToLabels = isAadhaarDocument
    ? aadhaarDataKeysToLabels
    : passportDataKeysToLabels;

  return (
    <YStack
      flex={1}
      gap="$2"
      justifyContent="flex-start"
      paddingBottom={bottom + extraYPadding}
      backgroundColor={white}
    >
      <ScrollView backgroundColor={white} paddingHorizontal="$4">
        {Object.entries(dataKeysToLabels).map(([key, label]) => (
          <InfoRow
            key={key}
            label={label}
            value={
              !metadata
                ? ''
                : isAadhaarDocument
                  ? (metadata?.[key as keyof DocumentMetadata] as
                      | string
                      | number) || 'None'
                  : key === 'cscaFound'
                    ? (metadata as PassportMetadata)?.cscaFound === true
                      ? 'Yes'
                      : 'No'
                    : (metadata?.[key as keyof DocumentMetadata] as
                        | string
                        | number) || 'None'
            }
          />
        ))}
      </ScrollView>
    </YStack>
  );
};

export default DocumentDataInfoScreen;
