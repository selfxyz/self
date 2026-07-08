// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PassportNfcInstructionsScreen } from '@selfxyz/euclid';
import { bridgeNFCScannerAdapter, onNfcProgress } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../../providers/BridgeProvider';
import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

type NfcStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface RouteState {
  countryCode?: string;
  documentType?: string;
  mrz?: {
    passportNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
  };
}

const progressStepToNfcStep = (progressStep: string): NfcStep => {
  switch (progressStep) {
    case 'initializing':
      return 1;
    case 'waiting_for_tag':
      return 2;
    case 'tag_discovered':
      return 4;
    case 'connected':
      return 5;
    case 'apdu_exchange':
      return 6;
    case 'apdu_complete':
    case 'complete':
      return 7;
    default:
      return 1;
  }
};

let activeNfcScan: Promise<unknown> | null = null;

export const PassportNfcRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { analytics, haptic, documents } = useSelfClient();
  const state = (location.state as RouteState | null) ?? {};
  const mrz = state.mrz;
  const nfcScanner = useMemo(() => bridgeNFCScannerAdapter(bridge), [bridge]);
  const [step, setStep] = useState<NfcStep>(1);

  useEffect(() => {
    if (!mrz) {
      navigate('/capture/passport/code-scan-instructions', { replace: true });
      return;
    }

    const unsubscribe = onNfcProgress(bridge, progress => {
      const next = progressStepToNfcStep(progress.step);
      setStep(prev => (next > prev ? next : prev));
    });

    let cancelled = false;

    void (async () => {
      // Module-level shared promise so StrictMode's double-effect in dev
      // doesn't strand the scan result in the first (cancelled) effect run.
      if (!activeNfcScan) {
        analytics.trackEvent('passport_nfc_scan_started');
        const sessionId =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `sess-${Date.now()}`;
        activeNfcScan = nfcScanner.scan({
          passportNumber: mrz.passportNumber,
          dateOfBirth: mrz.dateOfBirth,
          dateOfExpiry: mrz.dateOfExpiry,
          sessionId,
        });
      }
      try {
        const result = await activeNfcScan;
        activeNfcScan = null;
        if (cancelled) return;

        const docId = `passport-${mrz.passportNumber}`;
        await documents.saveDocument(docId, result as never);
        const catalog = await documents.loadDocumentCatalog();
        const entry = {
          id: docId,
          documentType: state.documentType ?? 'passport',
          documentCategory: 'passport' as const,
          data: '',
          mock: false,
          isRegistered: false,
        };
        const existingIndex = catalog.documents.findIndex((d: { id: string }) => d.id === docId);
        if (existingIndex >= 0) {
          catalog.documents[existingIndex] = entry;
        } else {
          catalog.documents.push(entry);
        }
        catalog.selectedDocumentId = docId;
        await documents.saveDocumentCatalog(catalog);

        analytics.trackEvent('passport_nfc_scan_succeeded');
        haptic.trigger('success');
        navigate('/capture/passport/nfc-success', {
          state: { countryCode: state.countryCode },
          replace: true,
        });
      } catch (err) {
        activeNfcScan = null;
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'NFC scan failed';
        analytics.trackEvent('passport_nfc_scan_failed', { error: message });
        haptic.trigger('warning');
        navigate('/capture/passport/nfc-error', {
          state: {
            countryCode: state.countryCode,
            errorMessage: message,
            stage: 'nfc',
          },
          replace: true,
        });
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [analytics, bridge, documents, haptic, mrz, navigate, nfcScanner, state.countryCode, state.documentType]);

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/capture/passport/code-scan-instructions', { replace: true });
  }, [haptic, navigate]);

  const onCaptureTips = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('passport_nfc_capture_tips');
  }, [analytics, haptic]);

  return (
    <PassportNfcInstructionsScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={handleBack}
      onCaptureTips={onCaptureTips}
      step={step}
    />
  );
};
