// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export const loadMiscAnimation = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- binary asset loaded by Metro
  Promise.resolve(require('@selfxyz/mobile-sdk-alpha/animations/loading/misc.lottie'));
export const loadPassportAnimation = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- binary asset loaded by Metro
  Promise.resolve(require('@/assets/animations/passport_verify.lottie'));
