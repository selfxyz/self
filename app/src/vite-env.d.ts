// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_DEV_PRIVATE_SECRET_FOR_TESTING: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
