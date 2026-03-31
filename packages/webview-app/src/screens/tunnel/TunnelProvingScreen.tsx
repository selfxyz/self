// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProofGenerationScreen } from '@selfxyz/euclid';

import { WEB_SAFE_AREA } from '../../utils/insets';

const MOCK_ID_CARD = {
  variant: 'passport' as const,
  title: 'Passport',
  subtitle: 'Mock Passport',
};

export const TunnelProvingScreen: React.FC = () => {
  const navigate = useNavigate();

  // TODO: replace with actual logic
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/tunnel/proof/result', { state: { success: true } });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return <ProofGenerationScreen {...WEB_SAFE_AREA} step="generatingProof" idCardProps={MOCK_ID_CARD} />;
};
