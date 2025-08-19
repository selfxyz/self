import type { PassportCameraProps } from '../../types/ui';

// Simple placeholder component - this would be replaced with actual camera UI
export const PassportCameraScreen = ({ onMRZDetected }: PassportCameraProps) => (
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
