import React, { useState, useMemo } from 'react';
import { Text, View, YStack, XStack, ScrollView } from 'tamagui';
import { useNavigate } from 'react-router-dom';

import { useBridge } from '../../providers/BridgeProvider';

const black = '#000000';
const white = '#ffffff';
const slate300 = '#CBD5E1';
const slate500 = '#64748B';
const dinot = 'DINOT-Medium';

interface Country {
  name: string;
  flag: string;
  code: string;
}

const COUNTRIES: Country[] = [
  { name: 'United States', flag: '\u{1F1FA}\u{1F1F8}', code: 'US' },
  { name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', code: 'GB' },
  { name: 'France', flag: '\u{1F1EB}\u{1F1F7}', code: 'FR' },
  { name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', code: 'DE' },
  { name: 'India', flag: '\u{1F1EE}\u{1F1F3}', code: 'IN' },
  { name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', code: 'JP' },
  { name: 'Australia', flag: '\u{1F1E6}\u{1F1FA}', code: 'AU' },
  { name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', code: 'BR' },
  { name: 'Nigeria', flag: '\u{1F1F3}\u{1F1EC}', code: 'NG' },
  { name: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}', code: 'KR' },
];

export const CountryPickerScreen: React.FC = () => {
  const navigate = useNavigate();
  const bridge = useBridge();
  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const query = search.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query),
    );
  }, [search]);

  const handleSelectCountry = (country: Country) => {
    bridge.fire('analytics', 'trackEvent', {
      event: 'country_selected',
      country: country.code,
    });
    navigate('/onboarding/id-type');
  };

  return (
    <YStack flex={1} backgroundColor={white}>
      {/* Header */}
      <XStack
        alignItems="center"
        paddingHorizontal={16}
        paddingVertical={12}
        gap={12}
      >
        <View
          pressStyle={{ opacity: 0.7 }}
          onPress={() => navigate(-1 as any)}
          cursor="pointer"
          padding={8}
        >
          <Text fontSize={20} color={black}>
            {'\u2190'}
          </Text>
        </View>
        <Text
          fontFamily={dinot}
          fontSize={20}
          fontWeight="500"
          color={black}
        >
          Select your country
        </Text>
      </XStack>

      {/* Search input */}
      <View paddingHorizontal={16} paddingBottom={8}>
        <View
          borderRadius={12}
          borderWidth={1}
          borderColor={slate300}
          overflow="hidden"
        >
          <input
            type="text"
            placeholder="Search countries..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 16,
              fontFamily: dinot,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              color: black,
            }}
          />
        </View>
      </View>

      {/* Country list */}
      <ScrollView flex={1}>
        <YStack>
          {filteredCountries.map((country) => (
            <XStack
              key={country.code}
              padding={16}
              gap={12}
              alignItems="center"
              borderBottomWidth={1}
              borderBottomColor="#F1F5F9"
              pressStyle={{ backgroundColor: '#F8FAFC' }}
              onPress={() => handleSelectCountry(country)}
              cursor="pointer"
            >
              <Text fontSize={24}>{country.flag}</Text>
              <Text fontFamily={dinot} fontSize={16} color={black}>
                {country.name}
              </Text>
            </XStack>
          ))}

          {filteredCountries.length === 0 && (
            <View padding={32} alignItems="center">
              <Text fontFamily={dinot} fontSize={16} color={slate500}>
                No countries found
              </Text>
            </View>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
};
