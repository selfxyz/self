// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import PlaceholderScreen from '../components/PlaceholderScreen';

type Props = {
  onBack: () => void;
};

export default function QRCodeViewFinder({ onBack }: Props) {
  return (
    <PlaceholderScreen
      title="QR Code View Finder"
      onBack={onBack}
      description="This screen would handle QR code scanning for proof verification and partner connections."
      features={[
        'QR code camera scanning',
        'Proof verification requests',
        'Partner app connections',
        'Session management',
        'Real-time QR detection feedback',
      ]}
    />
  );
}
