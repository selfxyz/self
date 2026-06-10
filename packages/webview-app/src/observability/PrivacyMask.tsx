// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';

// `sentry-mask` is Sentry Session Replay's default mask class: descendants are
// redacted in the replay regardless of the global maskAllText default. Mirrors
// the RN host's PrivacyMask (app/src/observability/PrivacyMask.tsx) so PII screens
// stay masked even if the global replay config changes. Applies a class only —
// must not import the Sentry SDK.
const MASK_CLASS = 'sentry-mask';

interface PrivacyMaskProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const PrivacyMask: React.FC<PrivacyMaskProps> = ({ children, className, style }) => (
  // `display: contents` keeps the wrapper out of layout while staying in the DOM
  // tree, so masking applies without disturbing the wrapped screen's flexbox.
  <div className={className ? `${MASK_CLASS} ${className}` : MASK_CLASS} style={{ display: 'contents', ...style }}>
    {children}
  </div>
);
