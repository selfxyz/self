// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { loadSelectedDocument, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import type { RootStackParamList } from '@/navigation';

export const useAadhaarNameOptions = (
  navigation: NativeStackNavigationProp<RootStackParamList>,
) => {
  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;

  const [nameParts, setNameParts] = useState<string[]>([]);
  const [firstNameIndex, setFirstNameIndex] = useState<number>(-1);
  const [lastNameIndex, setLastNameIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAadhaarData = async () => {
      const selectedDocument = await loadSelectedDocument(selfClient);

      if (
        !selectedDocument ||
        selectedDocument.data.documentCategory !== 'aadhaar' ||
        selectedDocument.metadata.documentCategory !== 'aadhaar' ||
        !selectedDocument.data.extractedFields?.name
      ) {
        trackEvent(AadhaarEvents.AADHAAR_DATA_NOT_FOUND);
        navigation.navigate('AadhaarUpload', { countryCode: 'IN' });
        return;
      }

      setFirstNameIndex(
        typeof selectedDocument.metadata.firstNameIndex === 'undefined'
          ? -1
          : selectedDocument.metadata.firstNameIndex,
      );
      setLastNameIndex(
        typeof selectedDocument.metadata.lastNameIndex === 'undefined'
          ? -1
          : selectedDocument.metadata.lastNameIndex,
      );

      const fullName = selectedDocument.data.extractedFields.name;

      const parsedNameParts = fullName
        .split(/\s+/)
        .filter(part => part.trim().length > 0);

      if (parsedNameParts.length < 2) {
        trackEvent(AadhaarEvents.INVALID_NAME_FORMAT);
        navigation.goBack();
        return;
      }

      setNameParts(parsedNameParts);
      trackEvent(AadhaarEvents.NAME_OPTIONS_LOADED, {
        optionCount: parsedNameParts.length,
      });

      setLoading(false);
    };

    loadAadhaarData();
  }, [navigation, trackEvent, selfClient]);

  return { loading, nameParts, firstNameIndex, lastNameIndex };
};
