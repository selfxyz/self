// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, ScrollView, Text, View, XStack, YStack } from 'tamagui';

import countryDocumentTypes from '../../data/country-document-types.json';

import { useSelfClient } from '../../providers/SelfClientProvider';

type CountryData = Record<string, string[]>;
const countryData = countryDocumentTypes as CountryData;

// Inline country names to avoid importing from @selfxyz/common (which pulls heavy deps)
// This is a subset — the full list is in common/src/constants/countries.ts
const getCountryName = (code: string): string => {
  // Use the Intl API to resolve country names from 3-letter codes
  // First convert ISO 3166-1 alpha-3 to alpha-2 for Intl support
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    // alpha3 → alpha2 mapping handled by trying the code directly
    // Intl.DisplayNames with 'region' type expects alpha-2, but we can try alpha-3
    const name = regionNames.of(code);
    if (name && name !== code) return name;
  } catch {
    // fallback
  }
  return code;
};

export const CountryPickerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const [search, setSearch] = useState('');

  const countries = useMemo(() => {
    return Object.keys(countryData).map(code => ({
      code,
      name: getCountryName(code),
    }));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase();
    return countries.filter(
      c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [countries, search]);

  const onSelect = useCallback(
    (countryCode: string) => {
      haptic.trigger('selection');
      const docTypes = countryData[countryCode];
      if (docTypes && docTypes.length > 0) {
        analytics.trackEvent('document_country_selected', { countryCode });
        navigate('/onboarding/id-type', {
          state: { countryCode, documentTypes: docTypes },
        });
      } else {
        navigate('/coming-soon', { state: { countryCode } });
      }
    },
    [navigate, analytics, haptic],
  );

  return (
    <YStack flex={1} backgroundColor="#ffffff">
      {/* Header */}
      <XStack
        paddingHorizontal={16}
        paddingTop={16}
        paddingBottom={12}
        alignItems="center"
      >
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

      {/* Title */}
      <YStack paddingHorizontal={16} paddingBottom={16}>
        <Text fontFamily="Advercase-Regular" fontSize={29} color="#000000">
          Select your country
        </Text>
      </YStack>

      {/* Search */}
      <YStack paddingHorizontal={16} paddingBottom={12}>
        <Input
          size="$4"
          fontFamily="DINOT-Medium"
          placeholder="Search country..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          borderColor="#CBD5E1"
          borderRadius={12}
          backgroundColor="#F8FAFC"
        />
      </YStack>

      {/* Country list */}
      <ScrollView flex={1} paddingHorizontal={16}>
        <YStack gap={2}>
          {filtered.map(country => (
            <XStack
              key={country.code}
              paddingVertical={14}
              paddingHorizontal={12}
              borderRadius={10}
              alignItems="center"
              gap={12}
              pressStyle={{ backgroundColor: '#F8FAFC' }}
              onPress={() => onSelect(country.code)}
              cursor="pointer"
            >
              <Text fontSize={16} fontFamily="DINOT-Medium" color="#000000">
                {country.name}
              </Text>
              <Text fontSize={13} fontFamily="DINOT-Medium" color="#94A3B8" marginLeft="auto">
                {country.code}
              </Text>
            </XStack>
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  );
};
