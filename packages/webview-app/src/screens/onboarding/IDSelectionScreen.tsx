// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IDTypeScreen } from '@selfxyz/euclid';
import type { IDType } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { getCountryName, renderFlag } from '../../utils/countryFlags';

const docTypeToIDType = (docType: string): IDType => {
  switch (docType) {
    case 'p':
      return { id: 'p', title: 'Passport', subtitle: 'Verified Biometric Passport' };
    case 'i':
      return { id: 'i', title: 'ID Card', subtitle: 'Verified Biometric ID card' };
    case 'a':
      return { id: 'a', title: 'Aadhaar', subtitle: 'Verified mAadhaar QR code' };
    case 'kyc':
      return { id: 'kyc', title: 'Other IDs', subtitle: "National ID, Driver's License etc." };
    default:
      return { id: docType, title: 'Unknown Document', subtitle: '' };
  }
};

const renderIDTypeIcon = (idType: IDType): React.ReactNode => {
  const emoji =
    idType.id === 'p'
      ? '🛂'
      : idType.id === 'i'
        ? '🪪'
        : idType.id === 'a'
          ? '🆔'
          : '📄';
  return <span style={{ fontSize: 24 }}>{emoji}</span>;
};

export const IDSelectionScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();

  const { countryCode = '', documentTypes = [] } =
    (location.state as {
      countryCode?: string;
      documentTypes?: string[];
    }) || {};

  const idTypes = documentTypes.map(docTypeToIDType);

  const onSelect = useCallback(
    (idType: IDType) => {
      haptic.trigger('selection');
      analytics.trackEvent('document_type_selected', {
        documentType: idType.id,
        countryCode,
      });

      if (idType.id === 'kyc') {
        navigate('/onboarding/provider', {
          state: { countryCode, documentType: idType.id },
        });
      } else {
        navigate('/coming-soon', {
          state: { countryCode, documentType: idType.id },
        });
      }
    },
    [navigate, analytics, haptic, countryCode],
  );

  const onNotListed = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('document_type_selected', {
      documentType: 'kyc',
      countryCode,
    });
    navigate('/onboarding/provider', {
      state: { countryCode, documentType: 'kyc' },
    });
  }, [navigate, analytics, haptic, countryCode]);

  return (
    <IDTypeScreen
      insets={{ top: 0, bottom: 0 }}
      countryCode={countryCode}
      countryName={getCountryName(countryCode)}
      idTypes={idTypes}
      onIDTypeSelect={onSelect}
      onNotListedPress={onNotListed}
      onBack={() => navigate(-1)}
      renderFlag={renderFlag}
      renderIDTypeIcon={renderIDTypeIcon}
    />
  );
};
