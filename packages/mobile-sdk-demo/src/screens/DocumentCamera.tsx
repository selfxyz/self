// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import { DocumentCameraScreen } from '@selfxyz/mobile-sdk-alpha/onboarding/document-camera-screen';

type Props = {
  onBack: () => void;
  onSuccess: () => void;
};

export default function DocumentCamera({ onBack, onSuccess }: Props) {
  return (
    <>
      <DocumentCameraScreen onBack={onBack} onSuccess={onSuccess} />
    </>
  );
}
