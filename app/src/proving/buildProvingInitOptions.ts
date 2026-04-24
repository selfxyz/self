// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ProvingInitOptions } from '@selfxyz/mobile-sdk-alpha';

import { useSettingStore } from '@/stores/settingStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

// Dev harness glue. Returns the ProvingInitOptions the app passes into
// the SDK proving-init call. The register-circuit test flow requires
// BOTH a dev build AND the user-opt-in toggle; otherwise the flag must
// be false (never undefined) so downstream code paths cannot accidentally
// treat it as truthy.
export function buildProvingInitOptions(): ProvingInitOptions {
  return {
    forceRegisterOnAlreadyRegistered:
      IS_DEV_MODE &&
      useSettingStore.getState().enableRecoveryCircuitTestFlow === true,
  };
}
