// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export const loadCryptoUtils = async () => {
  const [elliptic, forge, ethers] = await Promise.all([
    import('elliptic'),
    import('node-forge'),
    import('ethers'),
  ]);
  return { elliptic, forge, ethers };
};

export const loadProvingUtils = async () => {
  return Promise.all([
    import('@selfxyz/mobile-sdk-alpha/stores'),
    import('@/proving/validateDocument'),
  ]);
};
