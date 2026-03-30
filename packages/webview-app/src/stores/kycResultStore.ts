// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { KycProviderResult } from '../types/kycProvider';

let _result: KycProviderResult | null = null;

export function clearKycResult(): void {
  _result = null;
}

export function getKycResult(): KycProviderResult | null {
  return _result;
}

export function setKycResult(result: KycProviderResult): void {
  _result = result;
}
