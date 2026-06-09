// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { colors } from '@selfxyz/euclid';

import { useReferenceId } from '../providers/OperatingModeProvider';
import { WEB_SAFE_AREA } from '../utils/insets';

const CONFIRM_MS = 1000;

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy path: some WebView/CSP contexts block the
    // async Clipboard API.
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copyable support reference shown on error screens. Renders the host-minted
 * reference id so a user can report it and an engineer can pull every Sentry
 * event for the session (`reference_id:<value>`). Renders nothing when no id
 * is available (old host / standalone browser mode).
 */
export const SupportReference: React.FC = () => {
  const referenceId = useReferenceId();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCopy = useCallback(() => {
    if (!referenceId) return;
    void copyText(referenceId).then(ok => {
      if (!ok) return;
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), CONFIRM_MS);
    });
  }, [referenceId]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!referenceId) return null;

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy reference ${referenceId}`}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: WEB_SAFE_AREA.insets.bottom,
        margin: '0 auto',
        appearance: 'none',
        border: 'none',
        background: 'color-mix(in srgb, white 82%, transparent)',
        color: colors.slate700,
        fontSize: 11,
        lineHeight: 1.4,
        textAlign: 'center',
        cursor: 'pointer',
        padding: '6px 10px',
        width: 'fit-content',
        maxWidth: 'calc(100% - 32px)',
        borderRadius: 999,
        boxShadow: '0 1px 8px rgba(15, 23, 42, 0.16)',
        overflowWrap: 'anywhere',
      }}
    >
      {copied ? 'Copied' : `Reference: ${referenceId}`}
    </button>
  );
};
