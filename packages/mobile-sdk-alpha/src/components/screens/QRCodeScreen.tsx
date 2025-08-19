import type { ScreenProps } from '../../types/ui';

export const QRCodeScreen = ({ onSuccess, onFailure }: ScreenProps) => (
  <div>
    <p>QR Code Scanner</p>
    <button onClick={onSuccess}>Simulate Success</button>
    <button onClick={() => onFailure(new Error('QR scan failed'))}>Simulate Failure</button>
  </div>
);
