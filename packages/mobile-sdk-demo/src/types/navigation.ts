// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ScreenId } from '../screens';

export type ScreenIdToRouteName = {
  [K in ScreenId]: K extends 'generate'
    ? 'Generate'
    : K extends 'register'
      ? 'Register'
      : K extends 'mrz'
        ? 'MRZ'
        : K extends 'nfc'
          ? 'NFC'
          : K extends 'documents'
            ? 'Documents'
            : K extends 'country-selection'
              ? 'CountrySelection'
              : K extends 'id-selection'
                ? 'IDSelection'
                : never;
};
