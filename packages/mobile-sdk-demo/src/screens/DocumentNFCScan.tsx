// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import PlaceholderScreen from '../components/PlaceholderScreen';

type Props = {
  onBack: () => void;
};

export default function DocumentNFCScan({ onBack }: Props) {
  return (
    <PlaceholderScreen
      title="Document NFC Scan"
      onBack={onBack}
      description="This screen would handle NFC-based passport reading for enhanced security and data extraction."
      features={[
        'NFC chip reading from passports',
        'PACE (Password Authenticated Connection Establishment)',
        'BAC (Basic Access Control) fallback',
        'Secure data extraction and validation',
        'Real-time NFC status and feedback',
      ]}
    />
  );
}
