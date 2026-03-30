// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CountryPickerScreen as EuclidCountryPickerScreen } from '@selfxyz/euclid';

import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import countryDocumentTypes from '../../data/country-document-types.json';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { getCountryName, renderFlag } from '../../utils/countryFlags';
import { WEB_SAFE_AREA } from '../../utils/insets';

type CountryData = Record<string, string[]>;
const countryData = countryDocumentTypes as CountryData;

export const CountryPickerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const [search, setSearch] = useState('');

  const countries = useMemo(() => Object.keys(countryData).map(code => ({ countryCode: code })), []);

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
    <>
      <MockRegistrationFailureButton />
      <EuclidCountryPickerScreen
        {...WEB_SAFE_AREA}
        countries={countries}
        isLoading={false}
        onCountrySelect={onSelect}
        onClose={() => navigate('/', { state: { skipOnboardingRedirect: true } })}
        renderFlag={renderFlag}
        getCountryName={getCountryName}
        searchValue={search}
        onSearchChange={setSearch}
      />
    </>
  );
};
