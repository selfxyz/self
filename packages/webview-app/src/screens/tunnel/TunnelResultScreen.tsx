// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { StatusState } from '@selfxyz/euclid';

export const TunnelResultScreen: React.FC = () => {
  const navigate = useNavigate();

  const onContinue = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <StatusState
      variant="success"
      title="Identity Verified"
      description="Your identity has been verified. You can now use Self ID to prove your identity to participating partners."
      animationSource="/animations/proof-success.json"
      animationSize={240}
      loopAnimation={false}
      buttonText="Continue"
      onButtonPress={onContinue}
    />
  );
};
