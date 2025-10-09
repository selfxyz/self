// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Buffer } from 'buffer';

declare module 'elliptic' {
  export interface KeyPair {
    getPrivate(enc?: string): Buffer | string;
    getPublic(compact?: boolean, enc?: string): Buffer | string | object;
    sign(msg: Buffer | string, enc?: string, options?: object): Signature;
    verify(
      msg: Buffer | string,
      signature: Signature | string | object,
    ): boolean;
    derive(pub: KeyPair): Buffer;
  }

  export interface Signature {
    r: Buffer;
    s: Buffer;
    recoveryParam?: number;
    toDER(enc?: string): Buffer | string;
  }

  export const curves: {
    secp256k1: object;
    p256: object;
    p384: object;
    p521: object;
    [key: string]: object;
  };

  export class ec {
    constructor(curve: string);
    keyFromPrivate(priv: string | Buffer | number[], enc?: string): KeyPair;
    keyFromPublic(pub: string | Buffer | object, enc?: string): KeyPair;
    genKeyPair(options?: object): KeyPair;
  }
}
