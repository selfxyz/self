// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { IDCardProps } from '@selfxyz/euclid';
import { DevModeScreen as EuclidDevModeScreen, LeftArrowIcon } from '@selfxyz/euclid';
import { generateMockDocument, storePassportData } from '@selfxyz/mobile-sdk-alpha';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

const ageOptions = [18, 21, 25, 30, 35, 42];
const expiryYearsOptions = [1, 2, 5, 10];

const documentTypeMap: Record<string, 'mock_passport' | 'mock_id_card' | 'mock_aadhaar'> = {
  passport: 'mock_passport',
  id_card: 'mock_id_card',
  aadhaar: 'mock_aadhaar',
};

const nationalityMap: Record<string, string> = {
  'united states of america': 'USA',
  germany: 'DEU',
  france: 'FRA',
  india: 'IND',
};

export const DevModeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { client, analytics, haptic } = useSelfClient();

  const [documentType, setDocumentType] = useState<keyof typeof documentTypeMap>('passport');
  const [nationality, setNationality] = useState<keyof typeof nationalityMap>('united states of america');
  const [ageIndex, setAgeIndex] = useState(1);
  const [expiryIndex, setExpiryIndex] = useState(2);
  const [ofacCheck, setOfacCheck] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const idCard: IDCardProps = {
    variant: 'dev-passport',
    title: 'Developer Passport',
    subtitle: 'Digital credential for developers',
  };

  const handleBack = useCallback(() => {
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

  const onGenerateMockDocument = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const selectedDocumentType = documentTypeMap[documentType];
      const selectedCountry = nationalityMap[nationality];
      const mockDoc = await generateMockDocument({
        age: ageOptions[ageIndex],
        expiryYears: expiryYearsOptions[expiryIndex],
        isInOfacList: !ofacCheck,
        selectedAlgorithm: 'sha256 rsa 65537 2048',
        selectedCountry,
        selectedDocumentType,
      });
      await storePassportData(client, mockDoc);
      haptic.trigger('selection');
      analytics.trackEvent('dev_mode_generate_mock', {
        documentType: selectedDocumentType,
        country: selectedCountry,
        age: ageOptions[ageIndex],
        expiryYears: expiryYearsOptions[expiryIndex],
        isInOfacList: !ofacCheck,
      });
      // Pass the document identity through state so RegisteringScreen renders
      // the correct IDCard variant on first paint (avoids a passport →
      // dev-passport flicker while loadSelectedDocument resolves async).
      navigate('/onboarding/registering', {
        replace: true,
        state: { documentCategory: mockDoc.documentCategory, mock: true },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'mock generation failed';
      console.error('[DevMode] generateMockDocument failed:', err);
      analytics.trackEvent('dev_mode_generate_mock_failed', { error: message });
      haptic.trigger('warning');
    } finally {
      setIsGenerating(false);
    }
  }, [
    analytics,
    ageIndex,
    client,
    documentType,
    expiryIndex,
    haptic,
    isGenerating,
    nationality,
    navigate,
    ofacCheck,
  ]);

  return (
    <EuclidDevModeScreen
      {...WEB_SAFE_AREA}
      escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      onBack={handleBack}
      idCard={idCard}
      documentType={documentType}
      onDocumentTypePress={() => {
        haptic.trigger('selection');
        setDocumentType(prev => {
          const order: Array<keyof typeof documentTypeMap> = ['passport', 'id_card', 'aadhaar'];
          return order[(order.indexOf(prev) + 1) % order.length];
        });
      }}
      nationality={nationality}
      onNationalityPress={() => {
        haptic.trigger('selection');
        setNationality(prev => {
          const order: Array<keyof typeof nationalityMap> = [
            'united states of america',
            'germany',
            'france',
            'india',
          ];
          return order[(order.indexOf(prev) + 1) % order.length];
        });
      }}
      age={`${ageOptions[ageIndex]} or older`}
      onAgeIncrement={() => setAgeIndex(prev => Math.min(prev + 1, ageOptions.length - 1))}
      onAgeDecrement={() => setAgeIndex(prev => Math.max(prev - 1, 0))}
      documentExpiresIn={`${expiryYearsOptions[expiryIndex]} year${expiryYearsOptions[expiryIndex] === 1 ? '' : 's'}`}
      onDocumentExpiresIncrement={() => setExpiryIndex(prev => Math.min(prev + 1, expiryYearsOptions.length - 1))}
      onDocumentExpiresDecrement={() => setExpiryIndex(prev => Math.max(prev - 1, 0))}
      ofacCheck={ofacCheck}
      onOfacCheckChange={value => {
        haptic.trigger('selection');
        setOfacCheck(value);
      }}
      onResetAllValues={onResetAllValues}
      onGenerateMockDocument={onGenerateMockDocument}
    />
  );
};
