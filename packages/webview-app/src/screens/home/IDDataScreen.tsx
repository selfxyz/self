// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  IdCardIcon,
  IDDataScreen as EuclidIDDataScreen,
  LeftArrowIcon,
  QuestionCircleStrokeIcon,
} from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

const MOCK_ID_CARD_DETAILS = {
  profileImage: '',
  type: 'ID CARD',
  code: 'SELF',
  documentNumber: '••••••1234',
  surname: 'DOE',
  givenName: 'JOHN',
  sex: 'M',
  nationality: 'UNITED STATES',
  dateOfBirth: '1990-01-15',
  placeOfBirth: 'NEW YORK',
  dateOfIssue: '2020-01-15',
  dateOfExpiry: '2030-01-15',
};

const MOCK_DOCUMENT_DATA = [
  { label: 'ID Type', value: 'Passport' },
  { label: 'Document number', value: '18-299217823' },
  { label: 'Surname', value: 'Doe' },
  { label: 'Given name', value: 'John' },
  { label: 'Nationality', value: 'United States' },
  { label: 'Date of birth', value: '1990-01-15' },
];

export const IDDataScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  const onManageID = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('id_data_manage_pressed');
    navigate('/manage-documents');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidIDDataScreen
      insets={WEB_SAFE_AREA.insets}
      idCard={{
        title: 'Passport',
        subtitleLine1: 'UNITED STATES PASSPORT',
        details: MOCK_ID_CARD_DETAILS,
        mrzLine1: 'P<USA0000000000USA9001150M3001150<<<<<<<<<<<<<<',
        mrzLine2: 'DOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<0',
      }}
      identificationDetailsTitle="Identification details"
      identificationDetailsDescription="All data is stored locally on your device. Self does not collect or share any of this information without your consent."
      identificationDetailsLogo={
        <div style={{ width: 32, height: 21, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IdCardIcon size={24} color="#2563EB" />
        </div>
      }
      documentData={MOCK_DOCUMENT_DATA}
      onClose={handleBack}
      onInfo={() => analytics.trackEvent('id_data_info_pressed')}
      onManageID={onManageID}
      closeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      infoIcon={({ size, color }) => <QuestionCircleStrokeIcon size={size} color={color} />}
    />
  );
};
