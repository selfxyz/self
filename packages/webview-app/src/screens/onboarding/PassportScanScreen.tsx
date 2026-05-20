// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { bridgeNFCScannerAdapter } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

type Phase = 'entry' | 'scanning' | 'success' | 'error';

interface ScanFormState {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
}

const yymmddPattern = /^\d{6}$/;

export const PassportScanScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const { analytics, haptic, documents } = useSelfClient();

  const nfcScanner = useMemo(() => bridgeNFCScannerAdapter(bridge), [bridge]);

  const { countryCode, documentType = 'passport' } =
    (location.state as { countryCode?: string; documentType?: string } | null) ?? {};

  const isIdCard = documentType === 'id_card';
  const documentCategory: 'passport' | 'id_card' = isIdCard ? 'id_card' : 'passport';
  const docNumberLabel = isIdCard ? 'ID card number' : 'Passport number';
  const docNumberPlaceholder = isIdCard ? 'e.g. ID12345678' : 'e.g. AB1234567';
  const screenTitle = isIdCard ? 'Scan your ID card' : 'Scan your passport';
  const screenSubtitle = isIdCard
    ? 'Enter the data from the MRZ on the back of your ID card, then tap it to your phone’s NFC reader.'
    : 'Enter the data from the MRZ on the photo page, then tap the back of your passport to your phone’s NFC reader.';

  const [form, setForm] = useState<ScanFormState>({
    passportNumber: '',
    dateOfBirth: '',
    dateOfExpiry: '',
  });
  const [phase, setPhase] = useState<Phase>('entry');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const canSubmit =
    form.passportNumber.trim().length > 0 &&
    yymmddPattern.test(form.dateOfBirth) &&
    yymmddPattern.test(form.dateOfExpiry);

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setPhase('scanning');
    setErrorMessage('');
    haptic.trigger('selection');
    analytics.trackEvent('passport_scan_started', { countryCode });

    const sessionId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sess-${Date.now()}`;

    try {
      const result = await nfcScanner.scan({
        passportNumber: form.passportNumber.trim().toUpperCase(),
        dateOfBirth: form.dateOfBirth,
        dateOfExpiry: form.dateOfExpiry,
        sessionId,
      });

      analytics.trackEvent('passport_scan_succeeded');
      haptic.trigger('success');

      const docId = `${documentCategory}-${form.passportNumber.trim().toUpperCase()}`;
      await documents.saveDocument(docId, result as never);

      const catalog = await documents.loadDocumentCatalog();
      const entry = {
        id: docId,
        documentType,
        documentCategory,
        data: '',
        mock: false,
        isRegistered: false,
      };
      const existingIndex = catalog.documents.findIndex(
        (d: { id: string }) => d.id === docId,
      );
      if (existingIndex >= 0) {
        catalog.documents[existingIndex] = entry;
      } else {
        catalog.documents.push(entry);
      }
      catalog.selectedDocumentId = docId;
      await documents.saveDocumentCatalog(catalog);

      setPhase('success');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error during NFC scan';
      setErrorMessage(message);
      analytics.trackEvent('passport_scan_failed', { error: message });
      haptic.trigger('warning');
      setPhase('error');
    }
  }, [
    analytics,
    canSubmit,
    countryCode,
    documents,
    documentType,
    form.dateOfBirth,
    form.dateOfExpiry,
    form.passportNumber,
    haptic,
    nfcScanner,
  ]);

  const onContinue = useCallback(() => {
    navigate('/onboarding/success', {
      state: { countryCode, documentType },
      replace: true,
    });
  }, [countryCode, documentType, navigate]);

  const onRetry = useCallback(() => {
    setPhase('entry');
    setErrorMessage('');
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: 16,
        padding: 20,
        paddingTop: WEB_SAFE_AREA.insets.top + 16,
        paddingBottom: WEB_SAFE_AREA.insets.bottom + 16,
        backgroundColor: '#ffffff',
        color: '#111111',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 24 }}>{screenTitle}</h2>
      <p style={{ margin: 0, color: '#555' }}>{screenSubtitle}</p>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {docNumberLabel}
        <input
          type="text"
          autoCapitalize="characters"
          value={form.passportNumber}
          onChange={e => setForm(f => ({ ...f, passportNumber: e.target.value }))}
          placeholder={docNumberPlaceholder}
          disabled={phase === 'scanning'}
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        Date of birth (YYMMDD)
        <input
          type="text"
          inputMode="numeric"
          value={form.dateOfBirth}
          onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
          placeholder="e.g. 900115"
          maxLength={6}
          disabled={phase === 'scanning'}
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        Date of expiry (YYMMDD)
        <input
          type="text"
          inputMode="numeric"
          value={form.dateOfExpiry}
          onChange={e => setForm(f => ({ ...f, dateOfExpiry: e.target.value }))}
          placeholder="e.g. 300620"
          maxLength={6}
          disabled={phase === 'scanning'}
          style={inputStyle}
        />
      </label>

      {phase === 'entry' && (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          style={{
            ...buttonStyle,
            opacity: canSubmit ? 1 : 0.4,
          }}
        >
          Tap to scan NFC
        </button>
      )}

      {phase === 'scanning' && (
        <div style={statusStyle}>
          <strong>Hold your passport against the back of your phone…</strong>
          <p style={{ margin: '8px 0 0' }}>
            Keep it still until the scan completes. This can take 5–15 seconds.
          </p>
        </div>
      )}

      {phase === 'success' && (
        <div style={{ ...statusStyle, borderColor: '#22aa66' }}>
          <strong>Passport saved.</strong>
          <p style={{ margin: '8px 0 0' }}>
            Your document is now in the wallet&apos;s keychain.
          </p>
          <button type="button" onClick={onContinue} style={buttonStyle}>
            Continue
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div style={{ ...statusStyle, borderColor: '#cc2222' }}>
          <strong>Scan failed</strong>
          <p style={{ margin: '8px 0 0', color: '#cc2222' }}>{errorMessage}</p>
          <button type="button" onClick={onRetry} style={buttonStyle}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 16,
  border: '1px solid #ccc',
  borderRadius: 8,
  fontFamily: 'inherit',
};

const buttonStyle: React.CSSProperties = {
  padding: '14px 18px',
  fontSize: 16,
  border: 'none',
  borderRadius: 10,
  backgroundColor: '#111',
  color: '#fff',
  cursor: 'pointer',
  marginTop: 12,
};

const statusStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 16,
  border: '1px solid #888',
  borderRadius: 10,
  backgroundColor: '#f7f7f7',
};
