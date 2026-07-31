// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export const KYC_PROVIDER = 'didit';

// Didit's MediaPipe auto-capture links aligned_alloc, which Android's libc
// only provides from API 28 (Android 9). Loading it on older devices throws
// an uncatchable UnsatisfiedLinkError inside a Didit background coroutine.
export const KYC_MIN_ANDROID_API_LEVEL = 28;

export const KYC_UNSUPPORTED_DEVICE_MESSAGE =
  'Alternative identity verification requires Android 9 or newer.';
