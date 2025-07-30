// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

interface CryptoUtils {
  elliptic: typeof import('elliptic');
  forge: typeof import('node-forge');
  ethers: typeof import('ethers');
}

export const loadCryptoUtils = async (): Promise<CryptoUtils> => {
  const [elliptic, forge, ethers] = await Promise.all([
    import('elliptic'),
    import('node-forge'),
    import('ethers'),
  ]);
  return { elliptic, forge, ethers };
};

export const loadProvingUtils = async () => {
  return Promise.all([
    import('./proving/provingMachine'),
    import('./proving/attest'),
    import('./proving/validateDocument'),
  ]);
};
