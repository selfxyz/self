// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';

import { ProofGenerationScreen as EuclidProofGenerationScreen } from '@selfxyz/euclid';

import { WEB_SAFE_AREA } from '../../utils/insets';

export const ProofGenerationDialogueScreen: React.FC = () => {
  return (
    <EuclidProofGenerationScreen
      {...WEB_SAFE_AREA}
      step="readingRegistry"
      idCardProps={{ variant: 'unverified', cardMoire: 'moire' }}
      lottieSource="/animations/proof-progress.json"
    />
  );
};
