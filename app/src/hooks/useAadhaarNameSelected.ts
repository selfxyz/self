// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import type { RootStackParamList } from '@/navigation';

type NameType = 'first' | 'last';

interface UseAadhaarNameSelectedParams {
  nameOptions: string[];
  part: 'first' | 'last';
}

export const useAadhaarNameSelected = ({
  nameOptions,
  part,
}: UseAadhaarNameSelectedParams) => {
  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return useCallback(
    async (selectedNameIndex: number) => {
      if (selectedNameIndex < 0 || selectedNameIndex > nameOptions.length - 1) {
        console.log(`Invalid Aadhar name selection index`, selectedNameIndex);

        return;
      }

      try {
        const catalog = await selfClient.loadDocumentCatalog();
        if (catalog.selectedDocumentId) {
          const docMetadata = catalog.documents.find(
            d => d.id === catalog.selectedDocumentId,
          );

          if (!docMetadata) {
            console.log('No document metadata found');

            return;
          }

          if (docMetadata.documentCategory !== 'aadhaar') {
            console.log('Document category is not Aadhaar');

            return;
          }

          if (part === 'first') {
            docMetadata.firstNameIndex = selectedNameIndex;
            docMetadata.lastNameIndex = -1;
          } else {
            docMetadata.lastNameIndex = selectedNameIndex;
          }

          await selfClient.saveDocumentCatalog(catalog);
          // trackEvent(config.savedEvent);
        }

        if (part === 'first') {
          navigation.navigate('AadhaarLastNameChooser');
        } else {
          navigation.navigate('AadhaarNameConfirmation');
        }
      } catch (error) {
        // @ts-expect-error
        trackEvent(AadhaarEvents.AADHAAR_NAME_SELECTION_ERROR, {
          error:
            error instanceof Error
              ? error.message
              : error?.toString() || 'Unknown error',
        });
      }
    },
    [nameOptions.join('-'), selfClient, trackEvent, navigation, part],
  );
};
