// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { EuIdNfcInstructionsScreen } from '@selfxyz/euclid';
import { bridgeNFCScannerAdapter } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../../providers/BridgeProvider';
import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

interface RouteState {
  countryCode?: string;
  documentType?: string;
  useCan?: boolean;
  canValue?: string;
  mrz?: {
    passportNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
  };
}

export const EuIdNfcInstructionsRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { analytics, haptic, documents } = useSelfClient();
  const state = (location.state as RouteState | null) ?? {};
  const nfcScanner = useMemo(() => bridgeNFCScannerAdapter(bridge), [bridge]);
  const startedRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/capture/eu-id/back-instructions', { replace: true });
  }, [haptic, navigate]);

  const onNeedHelp = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('eu_id_nfc_need_help');
  }, [analytics, haptic]);

  const handleContinue = useCallback(() => {
    if (startedRef.current || busy) return;
    startedRef.current = true;
    setBusy(true);
    haptic.trigger('selection');
    analytics.trackEvent('eu_id_nfc_scan_started');

    const sessionId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sess-${Date.now()}`;

    const scanParams = state.useCan
      ? {
          passportNumber: state.mrz?.passportNumber ?? '',
          dateOfBirth: state.mrz?.dateOfBirth ?? '',
          dateOfExpiry: state.mrz?.dateOfExpiry ?? '',
          canNumber: state.canValue ?? '',
          useCan: true,
          sessionId,
        }
      : {
          passportNumber: state.mrz?.passportNumber ?? '',
          dateOfBirth: state.mrz?.dateOfBirth ?? '',
          dateOfExpiry: state.mrz?.dateOfExpiry ?? '',
          sessionId,
        };

    void (async () => {
      try {
        const result = await nfcScanner.scan(scanParams);
        const documentNumber = state.mrz?.passportNumber ?? state.canValue ?? 'unknown';
        const docId = `id_card-${documentNumber}`;
        await documents.saveDocument(docId, result as never);

        const catalog = await documents.loadDocumentCatalog();
        const entry = {
          id: docId,
          documentType: state.documentType ?? 'id_card',
          documentCategory: 'id_card' as const,
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

        analytics.trackEvent('eu_id_nfc_scan_succeeded');
        haptic.trigger('success');
        navigate('/capture/eu-id/nfc-success', {
          state: { countryCode: state.countryCode },
          replace: true,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'NFC scan failed';
        analytics.trackEvent('eu_id_nfc_scan_failed', { error: message });
        haptic.trigger('warning');
        navigate('/capture/eu-id/nfc-error', {
          state: {
            countryCode: state.countryCode,
            errorMessage: message,
            stage: 'nfc',
          },
          replace: true,
        });
      } finally {
        setBusy(false);
        startedRef.current = false;
      }
    })();
  }, [
    analytics,
    busy,
    documents,
    haptic,
    navigate,
    nfcScanner,
    state.canValue,
    state.countryCode,
    state.documentType,
    state.mrz,
    state.useCan,
  ]);

  return (
    <EuIdNfcInstructionsScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={handleBack}
      onNeedHelp={onNeedHelp}
      onContinue={handleContinue}
    />
  );
};
