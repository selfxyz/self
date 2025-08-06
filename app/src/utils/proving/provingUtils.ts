// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import forge from 'node-forge';

import {
  WS_DB_RELAYER,
  WS_DB_RELAYER_STAGING,
} from '@selfxyz/common/constants';
import type { EndpointType } from '@selfxyz/common/utils';
import { initElliptic } from '@selfxyz/common/utils';

const elliptic = initElliptic();
const { ec: EC } = elliptic;
// Use a consistent client keypair for the session
export type TEEPayload = TEEPayloadBase & {
  type: RegisterProofType | DscProofType;
  onchain: true;
};

export type TEEPayloadBase = {
  endpointType: EndpointType;
  circuit: {
    name: string;
    inputs: string;
  };
};
export type TEEPayloadDisclose = TEEPayloadBase & {
  type: DiscloseProofType;
  onchain: boolean;
  endpoint: string;
  userDefinedData: string;
  version: number;
};

export const ec = new EC('p256');

export const clientKey = ec.genKeyPair();

type RegisterSuffixes = '' | '_id';
type DscSuffixes = '' | '_id';
type DiscloseSuffixes = '' | '_id';
type ProofTypes = 'register' | 'dsc' | 'disclose';
type RegisterProofType =
  `${Extract<ProofTypes, 'register'>}${RegisterSuffixes}`;
type DscProofType = `${Extract<ProofTypes, 'dsc'>}${DscSuffixes}`;
type DiscloseProofType =
  `${Extract<ProofTypes, 'disclose'>}${DiscloseSuffixes}`;

export const clientPublicKeyHex =
  clientKey.getPublic().getX().toString('hex').padStart(64, '0') +
  clientKey.getPublic().getY().toString('hex').padStart(64, '0');

export function encryptAES256GCM(
  plaintext: string,
  key: forge.util.ByteStringBuffer,
) {
  const iv = forge.random.getBytesSync(12);
  const cipher = forge.cipher.createCipher('AES-GCM', key);
  cipher.start({ iv: iv, tagLength: 128 });
  cipher.update(forge.util.createBuffer(plaintext, 'utf8'));
  cipher.finish();
  const encrypted = cipher.output.getBytes();
  const authTag = cipher.mode.tag.getBytes();
  return {
    nonce: Array.from(Buffer.from(iv, 'binary')),
    cipher_text: Array.from(Buffer.from(encrypted, 'binary')),
    auth_tag: Array.from(Buffer.from(authTag, 'binary')),
  };
}

export function getPayload(
  inputs: any,
  circuitType: RegisterProofType | DscProofType | DiscloseProofType,
  circuitName: string,
  endpointType: EndpointType,
  endpoint: string,
  version: number = 1,
  userDefinedData: string = '',
) {
  if (circuitType === 'disclose') {
    const payload: TEEPayloadDisclose = {
      type: circuitName === 'vc_and_disclose' ? 'disclose' : 'disclose_id',
      endpointType: endpointType,
      endpoint: endpoint,
      onchain: endpointType === 'celo' ? true : false,
      circuit: {
        name: circuitName,
        inputs: JSON.stringify(inputs),
      },
      version,
      userDefinedData,
    };
    return payload;
  } else {
    const payload: TEEPayload = {
      type: circuitType as RegisterProofType | DscProofType,
      onchain: true,
      endpointType: endpointType,
      circuit: {
        name: circuitName,
        inputs: JSON.stringify(inputs),
      },
    };
    return payload;
  }
}

export function getWSDbRelayerUrl(endpointType: EndpointType) {
  return endpointType === 'celo' || endpointType === 'https'
    ? WS_DB_RELAYER
    : WS_DB_RELAYER_STAGING;
}
