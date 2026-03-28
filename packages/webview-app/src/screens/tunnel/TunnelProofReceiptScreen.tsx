// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProofRequestScreen, SelfLogo } from '@selfxyz/euclid';

import { WEB_SAFE_AREA } from '../../utils/insets';

const MOCK_ITEMS = [
  { label: 'Full Name' },
  { label: 'Date of Birth' },
  { label: 'Nationality' },
  { label: 'Age above 18' },
];

export const TunnelProofReceiptScreen: React.FC = () => {
  const navigate = useNavigate();

  const onConfirm = useCallback(() => {
    navigate('/tunnel/proof/generating');
  }, [navigate]);

  const onClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <ProofRequestScreen
      {...WEB_SAFE_AREA}
      variant="default"
      onClose={onClose}
      onConfirm={onConfirm}
      appIcon={<SelfLogo size={40} />}
      appName="KYC"
      appEndpoint="example.com"
      documentType="passport"
      timestamp={Date.now()}
      items={MOCK_ITEMS}
    />
  );
};
