import type { ReactNode } from 'react';
import { useCallback, useLayoutEffect, useState } from 'react';

import type { DocumentCategory, PassportData } from '@selfxyz/common';

import { SelfClientProvider, useSelfClient } from '../context';
import type { Adapters, Config } from '../types/public';

// Local interface for document metadata
interface DocumentMetadata {
  id: string;
  documentType: string;
  documentCategory: DocumentCategory;
  data: string;
  mock: boolean;
  isRegistered?: boolean;
}

interface DocumentData {
  data: PassportData;
  metadata: DocumentMetadata;
}

interface External {
  getSecret: () => Promise<string>;
  getAllDocuments: () => Promise<{
    [documentId: string]: DocumentData;
  }>;
  setDocument: (doc: DocumentData, documentId: string) => Promise<boolean>;
  onOnboardingSuccess: () => void;
  onOnboardingFailure: (error: Error) => void;
  onDisclosureSuccess: () => void;
  onDisclosureFailure: (error: Error) => void;
}

interface SelfMobileSdkProps {
  config: Config;
  adapters?: Partial<Adapters>;
  external: External;
  children?: ReactNode;
}

// Simple placeholder components - these would be replaced with actual UI components
const PassportCameraScreen = ({ onMRZDetected }: { onMRZDetected: (mrzData: any) => void }) => (
  <div>
    <p>Passport Camera</p>
    <button
      onClick={() =>
        onMRZDetected({ documentNumber: 'test', birthDate: 'test', expiryDate: 'test', countryCode: 'test' })
      }
    >
      Simulate MRZ Detection
    </button>
  </div>
);

const QrCodeScreen = ({ onSuccess, onFailure }: { onSuccess: () => void; onFailure: (error: Error) => void }) => (
  <div>
    <p>QR Code Scanner</p>
    <button onClick={onSuccess}>Simulate Success</button>
    <button onClick={() => onFailure(new Error('QR scan failed'))}>Simulate Failure</button>
  </div>
);

const NFCScannerScreen = ({ onSuccess, onFailure }: { onSuccess: () => void; onFailure: (error: Error) => void }) => {
  const client = useSelfClient();

  const onNFCScan = useCallback(
    async (_nfcData: any) => {
      try {
        // scan the document
        // register the document
        onSuccess();
      } catch (error) {
        onFailure(error as Error);
      }
    },
    [client, onSuccess, onFailure],
  );

  return (
    <div>
      <p>NFC Scanner</p>
      <button onClick={() => onNFCScan({})}>Simulate NFC Scan</button>
    </div>
  );
};

const OnboardingScreen = ({
  onSuccess,
  onFailure,
  _setDocument,
}: {
  onSuccess: () => void;
  onFailure: (error: Error) => void;
  _setDocument: (doc: DocumentData, documentId: string) => Promise<boolean>;
}) => {
  const [mrzData, setMrzData] = useState<any>(null);
  const client = useSelfClient();

  const onMRZDetected = useCallback(
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
          onSuccess();
        } else {
          onFailure(new Error('Registration failed'));
        }
      } catch (error) {
        onFailure(error as Error);
      }
    },
    [client, onSuccess, onFailure],
  );

  return (
    <div>
      <p>Onboarding</p>
      {!mrzData && <PassportCameraScreen onMRZDetected={onMRZDetected} />}
      {mrzData && <NFCScannerScreen onSuccess={onSuccess} onFailure={onFailure} />}
    </div>
  );
};

const SelfMobileSdkContent = ({ external }: { external: External }) => {
  const {
    getAllDocuments,
    onOnboardingSuccess,
    onOnboardingFailure,
    onDisclosureSuccess,
    onDisclosureFailure,
    setDocument,
  } = external;

  const [documents, setDocuments] = useState<{
    [documentId: string]: DocumentData;
  }>({});

  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    getAllDocuments()
      .then(documents => {
        setDocuments(documents);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load documents:', error);
        setIsLoading(false);
      });
  }, [getAllDocuments]);

  if (isLoading) {
    return <div>Loading documents...</div>;
  }

  // Check if user has any registered documents
  const hasRegisteredDocuments = Object.values(documents).some(doc => doc.metadata.isRegistered);

  if (Object.keys(documents).length === 0 || !hasRegisteredDocuments) {
    // Start onboarding flow
    return (
      <OnboardingScreen onSuccess={onOnboardingSuccess} onFailure={onOnboardingFailure} _setDocument={setDocument} />
    );
  }

  // Show disclosure flow
  return <QrCodeScreen onSuccess={onDisclosureSuccess} onFailure={onDisclosureFailure} />;
};

export const SelfMobileSdk = ({ config, adapters = {}, external, children }: SelfMobileSdkProps) => {
  return (
    <SelfClientProvider config={config} adapters={adapters}>
      {children || <SelfMobileSdkContent external={external} />}
    </SelfClientProvider>
  );
};
