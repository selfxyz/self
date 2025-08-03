// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11
export const DEFAULT_DOB = undefined;

export const DEFAULT_DOE = undefined;

export const DEFAULT_PNUMBER = undefined;

export const ENABLE_DEBUG_LOGS = process.env.ENABLE_DEBUG_LOGS === 'true';

export const GOOGLE_SIGNIN_ANDROID_CLIENT_ID =
  process.env.GOOGLE_SIGNIN_ANDROID_CLIENT_ID;

export const GOOGLE_SIGNIN_WEB_CLIENT_ID =
  process.env.GOOGLE_SIGNIN_WEB_CLIENT_ID;

/* This file provides compatiblity between how web expects env variables to be and how native does.
 *   on web it is aliased to @env on native it is not used
 */
export const IS_TEST_BUILD = process.env.IS_TEST_BUILD === 'true';
export const MIXPANEL_NFC_PROJECT_TOKEN = undefined;
export const SEGMENT_KEY = process.env.SEGMENT_KEY;
export const SENTRY_DSN = process.env.SENTRY_DSN;
