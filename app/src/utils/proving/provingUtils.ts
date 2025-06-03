import type { EndpointType } from '@selfxyz/common';
import {
  initElliptic,
  WS_DB_RELAYER,
  WS_DB_RELAYER_STAGING,
} from '@selfxyz/common';
import forge from 'node-forge';

const elliptic = initElliptic();
const { ec: EC } = elliptic;
export const ec = new EC('p256');
export const clientKey = ec.genKeyPair(); // Use a consistent client keypair for the session
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

export type TEEPayloadDisclose = {
  type: 'disclose';
  endpointType: string;
  endpoint: string;
  onchain: boolean;
  circuit: {
    name: string;
    inputs: string;
  };
};

export type TEEPayload = {
  type: 'register' | 'dsc';
  onchain: true;
  endpointType: string;
  circuit: {
    name: string;
    inputs: string;
  };
};

export function getPayload(
  inputs: any,
  circuitType: 'register' | 'dsc' | 'disclose',
  circuitName: string,
  endpointType: EndpointType,
  endpoint: string,
) {
  if (circuitType === 'disclose') {
    const payload: TEEPayloadDisclose = {
      type: 'disclose',
      endpointType: endpointType,
      endpoint: endpoint,
      onchain: endpointType === 'celo' ? true : false,
      circuit: {
        name: circuitName,
        inputs: JSON.stringify(inputs),
      },
    };
    return payload;
  } else {
    const payload: TEEPayload = {
      type: circuitType as 'register' | 'dsc',
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
