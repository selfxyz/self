// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@selfxyz/euclid';

export const KycMockScreen: React.FC = () => {
  const navigate = useNavigate();

  const onContinue = useCallback(() => {
    navigate('/tunnel/proof/receipt');
  }, [navigate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 32,
        padding: 24,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 28 }}>KYC mock</h1>
      <Button variant="primary-no-icon" text="Continue" onPress={onContinue} fullWidth />
    </div>
  );
};
