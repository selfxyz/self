// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { IDCardProps } from '@selfxyz/euclid';
import { DevModeScreen as EuclidDevModeScreen, LeftArrowIcon } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';

const ageOptions = ['18 or older', '21 or older', '25 or older', '30 or older'];
const expiryOptions = ['1 year', '2 years', '5 years', '10 years'];

export const DevModeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const [documentType, setDocumentType] = useState('passport');
  const [nationality, setNationality] = useState('united states of america');
  const [ageIndex, setAgeIndex] = useState(1);
  const [expiryIndex, setExpiryIndex] = useState(2);
  const [ofacCheck, setOfacCheck] = useState(true);

  const idCard: IDCardProps = {
    variant: 'dev-passport',
    title: 'Developer Passport',
    subtitle: 'Digital credential for developers',
  };

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

  const onResetAllValues = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('dev_mode_reset');
    setDocumentType('passport');
    setNationality('united states of america');
    setAgeIndex(1);
    setExpiryIndex(2);
    setOfacCheck(true);
  }, [haptic, analytics]);

  const onGenerateMockDocument = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('dev_mode_generate_mock', {
      documentType,
      nationality,
      age: ageOptions[ageIndex],
      expiresIn: expiryOptions[expiryIndex],
      ofacCheck,
    });
    navigate('/');
  }, [navigate, haptic, analytics, documentType, nationality, ageIndex, expiryIndex, ofacCheck]);

  return (
    <>
      <EuclidDevModeScreen
        insets={{ top: 0, bottom: 0 }}
        escapeIcon={({ size, color }) => (
          <LeftArrowIcon size={size} color={color} />
        )}
        onBack={onBack}
        idCard={idCard}
        documentType={documentType}
        onDocumentTypePress={() => {
          setDocumentType(prev => (prev === 'passport' ? 'id_card' : 'passport'));
        }}
        nationality={nationality}
        onNationalityPress={() => {
          setNationality(prev =>
            prev === 'united states of america' ? 'germany' : 'united states of america',
          );
        }}
        age={ageOptions[ageIndex]}
        onAgeIncrement={() => setAgeIndex(prev => Math.min(prev + 1, ageOptions.length - 1))}
        onAgeDecrement={() => setAgeIndex(prev => Math.max(prev - 1, 0))}
        documentExpiresIn={expiryOptions[expiryIndex]}
        onDocumentExpiresIncrement={() =>
          setExpiryIndex(prev => Math.min(prev + 1, expiryOptions.length - 1))
        }
        onDocumentExpiresDecrement={() => setExpiryIndex(prev => Math.max(prev - 1, 0))}
        ofacCheck={ofacCheck}
        onOfacCheckChange={value => {
          haptic.trigger('selection');
          setOfacCheck(value);
        }}
        onResetAllValues={onResetAllValues}
        onGenerateMockDocument={onGenerateMockDocument}
      />
      
    </>
  );
};
