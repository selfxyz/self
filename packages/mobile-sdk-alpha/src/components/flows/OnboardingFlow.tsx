import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useSelfClient } from '../../context';
import type { DocumentData, ExternalAdapter } from '../../types/ui';
import { NFCScannerScreen } from '../screens/NFCScannerScreen';
import { PassportCameraScreen } from '../screens/PassportCameraScreen';

interface OnboardingFlowProps {
  external: ExternalAdapter;
  setDocument: (doc: DocumentData, documentId: string) => Promise<boolean>;
  PassportCamera?: ReactNode;
  NFCScanner?: ReactNode;
}

export const OnboardingFlow = ({ external, setDocument, PassportCamera, NFCScanner }: OnboardingFlowProps) => {
  const [mrzData, setMrzData] = useState<any>(null);
  const client = useSelfClient();

  const handleMRZDetected = useCallback(
    async (mrzData: any) => {
      try {
        const status = await client.registerDocument({
          scan: {
            mode: 'mrz',
            passportNumber: mrzData.documentNumber,
            dateOfBirth: mrzData.birthDate,
            dateOfExpiry: mrzData.expiryDate,
            issuingCountry: mrzData.countryCode,
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
    return PassportCamera || <PassportCameraScreen onMRZDetected={handleMRZDetected} />;
  }

  return (
    NFCScanner || <NFCScannerScreen onSuccess={external.onOnboardingSuccess} onFailure={external.onOnboardingFailure} />
  );
};
