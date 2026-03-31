// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { colors, StatusState, WarningOctagonIcon } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const TunnelResultScreen: React.FC = () => {
  const location = useLocation();
  const { lifecycle } = useSelfClient();

  const { success = true, errorMessage } = (location.state as { success?: boolean; errorMessage?: string }) || {};

  const onContinue = useCallback(async () => {
    await lifecycle.setResult(
      success
        ? { success: true }
        : { success: false, error: { code: 'DISCLOSURE_FAILED', message: errorMessage ?? 'Disclosure failed' } },
    );
  }, [errorMessage, lifecycle, success]);

  return (
    <StatusState
      variant={success ? 'success' : 'fail'}
      title={success ? 'Identity Verified' : 'Verification Failed'}
      description={
        success
          ? 'Your identity has been verified. You can now use Self ID to prove your identity to participating partners.'
          : (errorMessage ?? 'Something went wrong during verification. Please try again.')
      }
      animationSource={success ? '/animations/proof-success.json' : undefined}
      animationSize={240}
      loopAnimation={false}
      buttonText="Continue"
      onButtonPress={onContinue}
      icon={success ? undefined : <WarningOctagonIcon size={64} color={colors.red500} />}
    />
  );
};
