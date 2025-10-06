export { extractMRZInfo, formatDateToYYMMDD } from '../../../mobile-sdk-alpha/src/processing/mrz';
export type { MRZInfo, MRZValidation } from '../../../mobile-sdk-alpha/src/types/public';

// Mock the onboarding/read-mrz module
export const MRZScannerView = ({ onScan: _onScan, onError: _onError, ...props }: any) => {
  // Mock component for testing
  void props; // Explicitly mark as intentionally unused
  return null;
};
