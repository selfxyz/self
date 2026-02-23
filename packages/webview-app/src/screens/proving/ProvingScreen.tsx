// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProofRequestScreen, SelfLogo } from '@selfxyz/euclid-web';

import { useSelfClient } from '../../providers/SelfClientProvider';

const DEFAULT_REQUEST_TYPE = 'proofRequested';
const DEFAULT_PROOF_ITEMS = [
  'Age verification',
  'Nationality',
  'Document validity',
];

interface ProvingScreenLocationState {
  requestType?: string;
  proofItems?: string[];
  appName?: string;
  appEndpoint?: string;
  timestamp?: number;
}

function titleCaseDisclosure(disclosure: string): string {
  return disclosure
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function parseProofItems(search: string): string[] | null {
  const params = new URLSearchParams(search);
  const proofItems = params.get('proofItems');
  if (proofItems) {
    const items = proofItems
      .split(',')
      .map((item) => decodeURIComponent(item).trim())
      .filter(Boolean);
    if (items.length > 0) return items;
  }

  const disclosures = params.get('disclosures');
  if (disclosures) {
    const items = disclosures
      .split(',')
      .map((item) => titleCaseDisclosure(decodeURIComponent(item)))
      .filter(Boolean);
    if (items.length > 0) return items;
  }

  return null;
}

export const ProvingScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? {}) as ProvingScreenLocationState;
  const { analytics, haptic, lifecycle } = useSelfClient();
  const [proving, setProving] = useState(false);

  const requestType = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (
      locationState.requestType ??
      params.get('resultType') ??
      DEFAULT_REQUEST_TYPE
    );
  }, [location.search, locationState.requestType]);

  const proofItems = useMemo(() => {
    if (Array.isArray(locationState.proofItems) && locationState.proofItems.length > 0) {
      return locationState.proofItems;
    }
    return parseProofItems(location.search) ?? DEFAULT_PROOF_ITEMS;
  }, [location.search, locationState.proofItems]);

  const appName = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return locationState.appName ?? params.get('appName') ?? 'Verification';
  }, [location.search, locationState.appName]);

  const appEndpoint = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return locationState.appEndpoint ?? params.get('appEndpoint') ?? '';
  }, [location.search, locationState.appEndpoint]);

  const timestamp = useMemo(() => {
    if (typeof locationState.timestamp === 'number') return locationState.timestamp;
    const queryTimestamp = new URLSearchParams(location.search).get('timestamp');
    const parsed = queryTimestamp ? Number(queryTimestamp) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [location.search, locationState.timestamp]);

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
      items={proofItems.map((label) => ({ label }))}
    />
  );
};
