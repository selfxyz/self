// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { KycPendingScreen } from '@selfxyz/euclid';

import { WEB_SAFE_AREA } from '../../utils/insets';
import { createMockProviderResult } from '../../utils/mockOnboardingFlow';

export const TunnelKycPendingScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTap = useCallback(() => {
    navigate(`/tunnel/kyc-success${location.search}`, {
      state: { providerResult: createMockProviderResult({ outcome: 'demo' }) },
    });
  }, [navigate, location.search]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <KycPendingScreen insets={WEB_SAFE_AREA.insets} onCheckBackLater={() => {}} onReceiveLiveUpdates={() => {}} />
      <div onClick={handleTap} style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: 'pointer' }} />
    </div>
  );
};
