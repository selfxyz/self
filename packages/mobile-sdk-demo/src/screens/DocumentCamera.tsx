// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import PlaceholderScreen from '../components/PlaceholderScreen';

type Props = {
  onBack: () => void;
};

export default function DocumentCamera({ onBack }: Props) {
  return (
    <PlaceholderScreen
      title="Document Camera"
      onBack={onBack}
      description="This screen would handle camera-based document scanning for passports and ID cards."
      features={[
        'Camera integration for document scanning',
        'MRZ (Machine Readable Zone) detection',
        'Document validation and parsing',
        'Real-time feedback and guidance',
      ]}
    />
  );
}
