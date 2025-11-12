// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export const DEFAULT_DOB = undefined;

export const DEFAULT_DOE = undefined;

export const DEFAULT_PNUMBER = undefined;

export const ENABLE_DEBUG_LOGS = process.env.ENABLE_DEBUG_LOGS === 'true';

export const GOOGLE_SIGNIN_ANDROID_CLIENT_ID =
  process.env.GOOGLE_SIGNIN_ANDROID_CLIENT_ID;

export const GOOGLE_SIGNIN_WEB_CLIENT_ID =
  process.env.GOOGLE_SIGNIN_WEB_CLIENT_ID;

export const GRAFANA_LOKI_PASSWORD = process.env.GRAFANA_LOKI_PASSWORD;
export const GRAFANA_LOKI_URL = process.env.GRAFANA_LOKI_URL;
export const GRAFANA_LOKI_USERNAME = process.env.GRAFANA_LOKI_USERNAME;

/* This file provides compatiblity between how web expects env variables to be and how native does.
 *   on web it is aliased to @env on native it is not used
 */
export const IS_TEST_BUILD = process.env.IS_TEST_BUILD === 'true';

export const MIXPANEL_NFC_PROJECT_TOKEN = undefined;
export const SEGMENT_KEY = process.env.SEGMENT_KEY;
export const SENTRY_DSN = process.env.SENTRY_DSN;

export const TURNKEY_AUTH_PROXY_CONFIG_ID =
  process.env.TURNKEY_AUTH_PROXY_CONFIG_ID;

export const TURNKEY_GOOGLE_CLIENT_ID = process.env.TURNKEY_GOOGLE_CLIENT_ID;
export const TURNKEY_ORGANIZATION_ID = process.env.TURNKEY_ORGANIZATION_ID;
