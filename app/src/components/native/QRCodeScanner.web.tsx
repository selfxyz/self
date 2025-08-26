// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import BarcodeScanner, { BarcodeFormat } from 'react-qr-barcode-scanner';

export interface QRCodeScannerViewProps {
  isMounted: boolean;
  onQRData: (error: Error | null, uri?: string) => void;
}

export function QRCodeScannerView({
  onQRData,
  isMounted,
}: QRCodeScannerViewProps) {
  if (!isMounted) {
    return null;
  }
  return (
    <BarcodeScanner
      width={500}
      height={500}
      formats={[BarcodeFormat.QR_CODE]}
      delay={300}
      onUpdate={(err, result) => {
        if (result) {
          const url = result.getText();
          console.log('SELF URL', url);
          onQRData(null, url);
        } else if (err && err instanceof Error) {
          // it will give NotFoundException2 every frame until a QR code is found so we ignore it because thats just noisy
          if (err.name !== 'NotFoundException2') {
            onQRData(err);
          }
        }
      }}
    />
  );
}

export default QRCodeScannerView;
