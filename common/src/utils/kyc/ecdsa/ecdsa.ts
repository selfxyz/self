import { poseidon5 } from 'poseidon-lite';
import { modulus } from './utils.js';
import { addPoint, Base8, mulPointEscalar, Point, subOrder } from '@zk-kit/baby-jubjub';
import { EdDSAPoseidon, Signature } from '@zk-kit/eddsa-poseidon';
import { packBytesAndPoseidon } from '../../hash.js';

export function signEdDSA(key: bigint, msg: number[]): [Signature, Point<bigint>] {
  key = modulus(key, subOrder);
  const msgHash = BigInt(packBytesAndPoseidon(msg));
  const eddsaFactory = new EdDSAPoseidon(key.toString());
  const signature = eddsaFactory.signMessage(msgHash.toString());
  console.assert(
    verifyEdDSAZkKit(eddsaFactory.publicKey, signature, msg) == true,
    'Invalid signature'
  );
  return [signature, eddsaFactory.publicKey];
}

export const verifyEdDSAZkKit = (pubkey: Point<bigint>, sig: Signature, msgArr: number[]) => {
  let msg = BigInt(packBytesAndPoseidon(msgArr));
  let challenge = poseidon5([sig.R8[0], sig.R8[1], pubkey[0], pubkey[1], msg]);

  let S = mulPointEscalar(Base8, BigInt(sig.S));
  let c_Pk = mulPointEscalar(pubkey, modulus(challenge * 8n, subOrder));
  let R_plus_c_Pk = addPoint([BigInt(sig.R8[0]), BigInt(sig.R8[1])], c_Pk);
  let minus_R_plus_c_Pk = mulPointEscalar(R_plus_c_Pk, modulus(-1n, subOrder));
  let V_plus_minus_R_plus_c_Pk = addPoint(S, minus_R_plus_c_Pk);
  let final = mulPointEscalar(V_plus_minus_R_plus_c_Pk, 8n);
  return final[0] == 0n && final[1] == 1n;
};

export function buffer2bits(buff) {
  const res = [];
  for (let i = 0; i < buff.length; i++) {
    for (let j = 0; j < 8; j++) {
      if ((buff[i] >> j) & 1) {
        res.push(1n);
      } else {
        res.push(0n);
      }
    }
  }
  return res;
}

//   export const verifyEdDSA = (pubkey: Point<bigint>, sig: Signature, msgStr: string) => {
//     let msg = modulus(BigInt(packBytesAndPoseidon(msgStr.split('').map(c => c.charCodeAt(0)))), subOrder);

//     let challenge = modulus(poseidon5([
//       sig.R[0],
//       sig.R[1],
//       pubkey[0],
//       pubkey[1],
//       msg
//     ]), subOrder);

//     let S = mulPointEscalar(Base8, sig.s);
//     let c_Pk = mulPointEscalar(pubkey, challenge);
//     let R_plus_c_Pk = addPoint(sig.R, c_Pk);
//     let minus_R_plus_c_Pk = mulPointEscalar(R_plus_c_Pk, modulus(-1n, subOrder));
//     let V_plus_minus_R_plus_c_Pk = addPoint(S, minus_R_plus_c_Pk);
//     //for the taceo library
//     let final = mulPointEscalar(V_plus_minus_R_plus_c_Pk, 8n);
//     return final[0] == 0n && final[1] == 1n;
//   }

//TODO: zk-kit/baby-jubjub uses affine which involses Fr.div which makes process slower , try to implement the function using PointProjective

// export function signECDSA(key: bigint, msg: number[]): Signature {
//     key = modulus(key, subOrder);
//     const msgHash = getECDSAMessageHash(msg);
//     // Deterministically generate the nonce k and reduce it modulo the subgroup order
//     const k = modulus(poseidon2([msgHash, key]), subOrder);

//     const R = mulPointEscalar(Base8, k);

//     const kInv = modInv(k, subOrder);

//     // Compute s = k_inv * (msg_hash + r * key) mod n
//     const s = modulus(
//         kInv * (msgHash + R[0] * key),
//         subOrder
//     );

//     return { R, s };
// }

// export function verifyECDSA(msg: number[], sig: Signature, pk: Point<bigint>): boolean {
//     const msgHash = getECDSAMessageHash(msg);

//     const sInv = modInv(sig.s, subOrder);

//     // u1 = msg_hash * s_inv mod n
//     const u1 = modulus((msgHash * sInv), subOrder);
//     // u2 = r * s_inv mod n
//     const u2 = modulus(sig.R[0] * sInv, subOrder);

//     // R = u1*G + u2*pk

//     const u1G = mulPointEscalar(Base8, u1);
//     const u2Pk = mulPointEscalar(pk, u2);
//     let R = addPoint(u1G, u2Pk);

//     return R[0] == sig.R[0]

// }

export function verifyEffECDSA(
  s: bigint,
  T: Point<bigint>,
  U: Point<bigint>,
  pk: Point<bigint>
): boolean {
  // Check if s*T + U == pk
  const sT = mulPointEscalar(T, s);
  const calPk = addPoint(sT, U);

  const xvalid = calPk[0] == pk[0];
  const yvalid = calPk[1] == pk[1];
  return xvalid && yvalid == true;
}
