// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProofRequestScreen, SelfLogo } from '@selfxyz/euclid-web';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';

function titleCaseDisclosure(disclosure: string): string {
  return disclosure
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export const ProvingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const { request, displayLabels, requestType, appName, appEndpoint, timestamp } =
    useVerificationRequest();
  const [proving, setProving] = useState(false);

  const proofItems = useMemo(() => {
    if (displayLabels && displayLabels.length > 0) {
      return displayLabels.map((label) => ({ label }));
    }
    return (request.disclosures ?? []).map((key) => ({
      label: titleCaseDisclosure(key),
    }));
  }, [displayLabels, request.disclosures]);

  const onVerify = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('prove_verify_pressed');
    setProving(true);

    try {
      await lifecycle.setResult({
        type: requestType,
      });

      navigate('/proving/result', { state: { success: true } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proving failed';
      analytics.trackEvent('prove_verify_failed', { error: message });
      navigate('/proving/result', {
        state: { success: false, error: message },
      });
    } finally {
      setProving(false);
    }
  }, [navigate, analytics, haptic, lifecycle, requestType]);

  const onCancel = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [navigate, haptic]);

  return (
    <ProofRequestScreen
      insets={{ top: 0, bottom: 0 }}
      variant={proving ? 'loading' : 'default'}
      onClose={onCancel}
      onConfirm={onVerify}
      appIcon={<SelfLogo size={40} />}
      appName={appName}
      appEndpoint={appEndpoint}
      timestamp={timestamp}
      items={proofItems}
    />
  );
};
