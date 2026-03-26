// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProofGenerationScreen } from '@selfxyz/euclid';

const MOCK_ID_CARD = {
  variant: 'passport' as const,
  title: 'Passport',
  subtitle: 'Mock Passport',
};

export const TunnelProvingScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/tunnel/proof/result');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return <ProofGenerationScreen insets={{ top: 0, bottom: 0 }} step="generatingProof" idCardProps={MOCK_ID_CARD} />;
};
