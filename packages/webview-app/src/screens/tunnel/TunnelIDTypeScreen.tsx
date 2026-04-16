// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { IDType } from '@selfxyz/euclid';
import { IDTypeScreen } from '@selfxyz/euclid';

import { getCountryName, renderFlag } from '../../utils/countryFlags';
import { WEB_SAFE_AREA } from '../../utils/insets';

const docTypeToIDType = (docType: string): IDType => {
  switch (docType) {
    case 'p':
      return { id: 'p', title: 'Passport', subtitle: 'Verified Biometric Passport' };
    case 'i':
      return { id: 'i', title: 'ID Card', subtitle: 'Verified Biometric ID card' };
    default:
      return { id: docType, title: 'Unknown Document', subtitle: '' };
  }
};

const renderIDTypeIcon = (idType: IDType): React.ReactNode => {
  const emoji = idType.id === 'p' ? '🛂' : '🪪';
  return <span style={{ fontSize: 24 }}>{emoji}</span>;
};

export const TunnelIDTypeScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { countryCode = 'US', documentTypes = ['p'] } =
    (location.state as { countryCode?: string; documentTypes?: string[] }) || {};

  const idTypes = documentTypes.map(docTypeToIDType);

  const onIDTypeSelect = useCallback(
    (_idType: IDType) => {
      navigate('/tunnel/proof/receipt');
    },
    [navigate],
  );

  return (
    <IDTypeScreen
      {...WEB_SAFE_AREA}
      countryCode={countryCode}
      countryName={getCountryName(countryCode)}
      idTypes={idTypes}
      onIDTypeSelect={onIDTypeSelect}
      onBack={() => navigate('/tunnel/registration/country')}
      renderFlag={renderFlag}
      renderIDTypeIcon={renderIDTypeIcon}
    />
  );
};
