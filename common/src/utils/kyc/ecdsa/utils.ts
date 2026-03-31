import { packBytesAndPoseidon } from '../../hash.js';
import { Signature } from '../types.js';

import { Base8, mulPointEscalar, Point, subOrder } from '@zk-kit/baby-jubjub';

//TODO: Recheck the logic
export function bigintTo64bitLimbs(x: bigint): bigint[] {
  const mask = (1n << 64n) - 1n;
  const limbs: bigint[] = [];
  for (let i = 0; i < 4; i++) {
    limbs.push(x & mask);
    x >>= 64n;
  }
  return limbs;
}

export const generateRandomsg = (): number[] => {
  const randomNumbers: number[] = Array.from({ length: 298 }, () =>
    Math.floor(Math.random() * 128)
  );
  return randomNumbers;
};

/**
 * Compute the hash of a message using the ECDSA algorithm
 * @param msg
 * @returns hash as a hex string
 */
export const getECDSAMessageHash = (msg: number[]): bigint => {
  const msgHash = BigInt(packBytesAndPoseidon(msg));
  return modulus(msgHash, subOrder);
};

export function getEffECDSAArgs(
  msg: number[],
  sig: Signature
): { T: Point<bigint>; U: Point<bigint> } {
  const msgHash = getECDSAMessageHash(msg);
  const rInv = modInv(sig.R[0], subOrder);

  // T = R * r_inv, where R is the signature's R point
  const T = mulPointEscalar(sig.R, rInv);
  // U = G * (-r_inv * msg_hash mod n), where G is the generator
  const rInvNeg = modulus(-rInv, subOrder);
  const U = mulPointEscalar(Base8, modulus(rInvNeg * msgHash, subOrder));
  return { T, U };
}

export function modInv(a: bigint, m: bigint): bigint {
  let m0 = m;
  let y = 0n,
    x = 1n;

  if (m === 1n) return 0n;

  while (a > 1n) {
    const q = a / m;
    let t = m;

    // m is remainder now
    m = a % m;
    a = t;
    t = y;

    // Update x and y
    y = x - q * y;
    x = t;
  }

  // Make x positive
  if (x < 0n) x += m0;

  return x;
}

export const modulus = (a: bigint, m: bigint): bigint => {
  return ((a % m) + m) % m;
};
