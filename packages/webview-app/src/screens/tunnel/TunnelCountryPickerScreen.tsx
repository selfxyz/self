// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CountryPickerScreen as EuclidCountryPickerScreen } from '@selfxyz/euclid';

import { getCountryName, renderFlag } from '../../utils/countryFlags';

const MOCK_COUNTRIES = [
  { countryCode: 'US' },
  { countryCode: 'GB' },
  { countryCode: 'DE' },
  { countryCode: 'PL' },
  { countryCode: 'FR' },
];

const MOCK_DOCUMENT_TYPES: Record<string, string[]> = {
  US: ['p', 'i'],
  GB: ['p'],
  DE: ['p', 'i'],
  PL: ['p', 'i'],
  FR: ['p', 'i'],
};

export const TunnelCountryPickerScreen: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const onCountrySelect = useCallback(
    (countryCode: string) => {
      navigate('/tunnel/registration/id-type', {
        state: { countryCode, documentTypes: MOCK_DOCUMENT_TYPES[countryCode] ?? ['p'] },
      });
    },
    [navigate],
  );

  return (
    <EuclidCountryPickerScreen
      insets={{ top: 0, bottom: 0 }}
      countries={MOCK_COUNTRIES}
      isLoading={false}
      onCountrySelect={onCountrySelect}
      onClose={() => navigate('/tunnel/kyc')}
      renderFlag={renderFlag}
      getCountryName={getCountryName}
      searchValue={search}
      onSearchChange={setSearch}
    />
  );
};
