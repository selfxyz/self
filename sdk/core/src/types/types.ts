import type { BigNumberish } from 'ethers';

export type VcAndDiscloseProof = {
  a: [BigNumberish, BigNumberish];
  b: [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]];
  c: [BigNumberish, BigNumberish];
  pubSignals: BigNumberish[];
};
