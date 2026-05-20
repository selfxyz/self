// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { IDType } from '@selfxyz/euclid';
import { IDTypeScreen } from '@selfxyz/euclid';

import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { getCountryName, renderFlag } from '../../utils/countryFlags';
import { WEB_SAFE_AREA } from '../../utils/insets';

const docTypeToIDType = (docType: string): IDType => {
  switch (docType) {
    case 'p':
      return { id: 'p', title: 'Passport', subtitle: 'Biometric Passport' };
    case 'i':
      return { id: 'i', title: 'ID Card', subtitle: 'Biometric Identification Card' };
    case 'a':
      return { id: 'a', title: 'Aadhaar', subtitle: 'Verified mAadhaar QR code' };
    case 'kyc':
      return { id: 'kyc', title: 'Other IDs', subtitle: "National ID, Driver's License etc." };
    default:
      return { id: docType, title: 'Unknown Document', subtitle: '' };
  }
};

const renderIDTypeIcon = (idType: IDType): React.ReactNode => {
  const emoji = idType.id === 'p' ? '🛂' : idType.id === 'i' ? '🪪' : idType.id === 'a' ? '🆔' : '📄';
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

  useEffect(() => {
    if (!countryCode || documentTypes.length === 0) {
      navigate('/onboarding/country', { replace: true });
    }
  }, [countryCode, documentTypes.length, navigate]);

  if (!countryCode || documentTypes.length === 0) {
    return null;
  }

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
      } else if (idType.id === 'p') {
        navigate('/onboarding/passport/scan', {
          state: { countryCode, documentType: 'passport' },
        });
      } else {
        navigate('/coming-soon', {
          state: { countryCode, documentType: idType.id },
        });
      }
    },
    [navigate, analytics, haptic, countryCode],
  );

  // const onNotListed = useCallback(() => {
  //   haptic.trigger('selection');
  //   analytics.trackEvent('document_type_selected', {
  //     documentType: 'kyc',
  //     countryCode,
  //   });
  //   navigate('/onboarding/provider', {
  //     state: { countryCode, documentType: 'kyc' },
  //   });
  // }, [navigate, analytics, haptic, countryCode]);

  return (
    <>
      <MockRegistrationFailureButton />
      <IDTypeScreen
        {...WEB_SAFE_AREA}
        countryCode={countryCode}
        countryName={getCountryName(countryCode)}
        idTypes={idTypes}
        onIDTypeSelect={onSelect}
        onBack={() => navigate(-1)}
        renderFlag={renderFlag}
        renderIDTypeIcon={renderIDTypeIcon}
      />
    </>
  );
};
