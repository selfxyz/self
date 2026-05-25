// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

// TODO(NAV-03 Action Items): replace this local wrapper with Euclid's
// generic ErrorScreen once it lands. Copy + analytics taxonomy below
// are placeholders pending UX review (see
// specs/projects/sdk/workstreams/nav-hygiene/plans/NAV-03-boot-decision.html
// #action-items).

interface EmbedErrorLocationState {
  code?: string;
}

/**
 * Persistent fallback rendered when the embed-mode boot guard fires
 * (invalid `verificationRequest`, bridge errors, etc.). Shown for the
 * brief window before `lifecycle.dismiss()` takes effect, and as a
 * stable surface if `dismiss()` never succeeds.
 */
export const EmbedErrorScreen: React.FC = () => {
  const location = useLocation();
  const bridge = useBridge();
  const { analytics } = useSelfClient();
  const state = (location.state as EmbedErrorLocationState | null) ?? {};

  useEffect(() => {
    analytics.trackEvent('embed_error_shown', { code: state.code });
  }, [analytics, state.code]);

  const onClose = () => {
    void bridge.request('lifecycle', 'dismiss', { reason: 'user_cancel' }).catch(() => {
      // Best-effort — the host may already be tearing down the WebView.
    });
  };

  return (
    <div
      style={{
        paddingTop: WEB_SAFE_AREA.insets.top,
        paddingBottom: WEB_SAFE_AREA.insets.bottom,
        minHeight: '100vh',
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 32,
      }}
    >
      <h1 style={{ fontSize: 22, margin: '0 0 16px' }}>Verification couldn't start</h1>
      <p style={{ fontSize: 14, opacity: 0.8, maxWidth: 360, margin: '0 0 32px' }}>
        The verification request was invalid or could not be completed. Please
        return to the app that opened this view.
      </p>
      <button
        type="button"
        onClick={onClose}
        style={{
          appearance: 'none',
          padding: '12px 24px',
          borderRadius: 8,
          border: '1px solid #fff',
          background: 'transparent',
          color: '#fff',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Close
      </button>
    </div>
  );
};
