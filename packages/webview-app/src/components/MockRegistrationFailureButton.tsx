// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// MOCK: Dev-only button to trigger registration failure flow. Remove once real provider errors are wired (WV-05 / WV-06).

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const MockRegistrationFailureButton: React.FC = () => {
  const navigate = useNavigate();
  const onOpenRegistrationFailureMock = useCallback(() => {
    navigate('/onboarding/failure?mock=registration-failure');
  }, [navigate]);

  if (!import.meta.env.DEV) return null;

  return (
    <button
      type="button"
      onClick={onOpenRegistrationFailureMock}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 10,
        border: '1px solid rgba(15, 23, 42, 0.16)',
        borderRadius: 999,
        background: 'rgba(255, 255, 255, 0.94)',
        color: '#0F172A',
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
      }}
    >
      Mock failure
    </button>
  );
};
