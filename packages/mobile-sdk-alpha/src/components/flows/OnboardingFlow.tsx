// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ComponentType } from 'react';
import { useCallback, useState } from 'react';

import { useSelfClient } from '../../context';
import type { MRZInfo } from '../../types/public';
import type { DocumentData, ExternalAdapter, PassportCameraProps, ScreenProps } from '../../types/ui';
import { NFCScannerScreen } from '../screens/NFCScannerScreen';
import { PassportCameraScreen } from '../screens/PassportCameraScreen';

interface OnboardingFlowProps {
  external: ExternalAdapter;
  setDocument: (doc: DocumentData, documentId: string) => Promise<boolean>;
  PassportCamera?: ComponentType<PassportCameraProps>;
  NFCScanner?: ComponentType<ScreenProps>;
}

export const OnboardingFlow = ({ external, setDocument, PassportCamera, NFCScanner }: OnboardingFlowProps) => {
  const [mrzData, setMrzData] = useState<MRZInfo | null>(null);
  const client = useSelfClient();

  const handleMRZDetected = useCallback(
    async (mrzData: MRZInfo) => {
      try {
        const status = await client.registerDocument({
          scan: {
            mode: 'mrz',
            passportNumber: mrzData.passportNumber,
            dateOfBirth: mrzData.dateOfBirth,
            dateOfExpiry: mrzData.dateOfExpiry,
            issuingCountry: mrzData.issuingCountry,
          },
        });

        if (status.registered) {
          setMrzData(mrzData);
        } else {
          external.onOnboardingFailure(new Error('Registration failed'));
        }
      } catch (error) {
        external.onOnboardingFailure(error as Error);
      }
    },
    [client, external, setDocument],
  );

  if (!mrzData) {
    if (PassportCamera) {
      const PCam = PassportCamera as ComponentType<PassportCameraProps>;
      return <PCam onMRZDetected={handleMRZDetected} />;
    }
    return <PassportCameraScreen onMRZDetected={handleMRZDetected} />;
  }

  if (NFCScanner) {
    const NFC = NFCScanner as ComponentType<ScreenProps>;
    return <NFC onSuccess={external.onOnboardingSuccess} onFailure={external.onOnboardingFailure} />;
  }
  return <NFCScannerScreen onSuccess={external.onOnboardingSuccess} onFailure={external.onOnboardingFailure} />;
};
