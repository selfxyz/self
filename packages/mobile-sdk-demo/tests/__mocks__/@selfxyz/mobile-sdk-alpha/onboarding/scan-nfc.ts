// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { vi } from 'vitest';

export const useScanNFC = vi.fn((props: any) => {
  const cancelScan = vi.fn(() => {
    props.onScanCancelled?.();
  });

  const startScan = vi.fn();

  return {
    status: 'idle',
    detailsMessage: null,
    isScanning: false,
    error: null,
    startScan,
    cancelScan,
  };
});
