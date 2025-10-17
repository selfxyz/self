// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

declare module 'react-native-safe-area-context' {
  export interface EdgeInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }

  export function useSafeAreaInsets(): EdgeInsets;
}
