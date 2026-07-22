// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CountryPickerScreen as EuclidCountryPickerScreen } from '@selfxyz/euclid';

import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import countryDocumentTypes from '../../data/country-document-types.json';
import { useCapabilities } from '../../providers/OperatingModeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';
import type { Capabilities } from '../../utils/capabilities';
import { isDocumentTypeAvailable } from '../../utils/capabilities';
import { getCountryName, renderFlag } from '../../utils/countryFlags';
import { WEB_SAFE_AREA } from '../../utils/insets';

type CountryData = Record<string, string[]>;
const countryData = countryDocumentTypes as CountryData;

// A country is a dead-end when it lists document types but every one needs a
// native capability the host lacks. Selecting it would land on an empty
// IDSelection that bounces straight back here, so hide it. Countries with no
// listed types keep the existing coming-soon path.
function isCountrySelectable(docTypes: string[] | undefined, capabilities: Capabilities): boolean {
  if (!docTypes || docTypes.length === 0) return true;
  return docTypes.some(docType => isDocumentTypeAvailable(docType, capabilities));
}

export const CountryPickerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const capabilities = useCapabilities();
  const [search, setSearch] = useState('');

  const countries = useMemo(
    () =>
      Object.keys(countryData)
        .filter(code => isCountrySelectable(countryData[code], capabilities))
        .map(code => ({ countryCode: code })),
    [capabilities],
  );

  const onSelect = useCallback(
    (countryCode: string) => {
      haptic.trigger('selection');
      const docTypes = countryData[countryCode];
      if (docTypes && docTypes.length > 0) {
        analytics.trackEvent('document_country_selected', { countryCode });
        navigate('/pick-id-type', {
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
