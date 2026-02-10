// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SetOptions } from 'react-native-keychain';

/**
 * Extended SetOptions with useStrongBox property added by our patch.
 * Use this type when you need the useStrongBox option for Android keystore.
 */
export type ExtendedSetOptions = SetOptions & {
  /**
   * Whether to attempt StrongBox-backed key generation on Android.
   * When true (default), the library will try to use StrongBox hardware
   * security module if available, falling back to regular secure hardware.
   * When false, StrongBox is skipped and regular secure hardware is used directly.
   * @platform Android
   * @default true
   */
  useStrongBox?: boolean;
};
