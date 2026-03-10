import { createRequire } from 'node:module';
import { subOrder } from '@zk-kit/baby-jubjub';
import { fileURLToPath } from 'node:url';

import { packBytesAndPoseidon } from './hash/poseidon.js';

function getRequire() {
  try {
    return createRequire(
      typeof import.meta?.url === 'string'
        ? import.meta.url
        : fileURLToPath(new URL('file://' + __filename)),
    );
  } catch {
    return createRequire(__filename);
  }
}

export function modulus(a: bigint, m: bigint): bigint {
  return ((a % m) + m) % m;
}

export function signEdDSA(key: bigint, msg: number[]) {
  const { EdDSAPoseidon } = getRequire()('@zk-kit/eddsa-poseidon');
  key = modulus(key, subOrder);
  const msgHash = BigInt(packBytesAndPoseidon(msg));
  const eddsaFactory = new EdDSAPoseidon(key.toString());
  const signature = eddsaFactory.signMessage(msgHash.toString());
  return [signature, eddsaFactory.publicKey] as [
    { R8: [bigint, bigint]; S: bigint },
    [bigint, bigint],
  ];
}
