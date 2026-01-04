import forge from 'node-forge';
import { Buffer } from 'buffer';

import { WS_DB_RELAYER, WS_DB_RELAYER_STAGING } from '../constants/index.js';
import { initElliptic } from '../utils/certificate_parsing/elliptic.js';
import type { EndpointType } from './appType.js';
import { isOnchainEndpointType } from '../constants/chains.js';

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
  selfDefinedData: string;
  version: number;
};

// // eslint-disable-next-line -- ec must be created first
export const ec = new EC('p256');
// eslint-disable-next-line -- clientKey is created from ec so must be second
export const clientKey = ec.genKeyPair();

type RegisterSuffixes = '' | '_id' | '_aadhaar';
type DscSuffixes = '' | '_id';
type DiscloseSuffixes = '' | '_id' | '_aadhaar';
type ProofTypes = 'register' | 'dsc' | 'disclose';
type RegisterProofType = `${Extract<ProofTypes, 'register'>}${RegisterSuffixes}`;
type DscProofType = `${Extract<ProofTypes, 'dsc'>}${DscSuffixes}`;
type DiscloseProofType = `${Extract<ProofTypes, 'disclose'>}${DiscloseSuffixes}`;

export const clientPublicKeyHex = clientKey.getPublic(true, 'hex');

export function encryptAES256GCM(plaintext: string, key: forge.util.ByteStringBuffer) {
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
  selfDefinedData: string = ''
) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c221fb1a-a001-4333-87b7-a57e506cd0d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'proving.ts:getPayload:entry',message:'getPayload called',data:{circuitType,circuitName,endpointType,endpoint,version,userDefinedData:userDefinedData?.slice(0,50),isOnchainFn:typeof isOnchainEndpointType},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,D,E'})}).catch(()=>{});
  // #endregion
  if (circuitType === 'disclose') {
    const type =
      circuitName === 'vc_and_disclose'
        ? 'disclose'
        : circuitName === 'vc_and_disclose_aadhaar'
          ? 'disclose_aadhaar'
          : 'disclose_id';
    // #region agent log
    const isOnchain = isOnchainEndpointType(endpointType);
    fetch('http://127.0.0.1:7243/ingest/c221fb1a-a001-4333-87b7-a57e506cd0d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'proving.ts:getPayload:disclose',message:'isOnchainEndpointType result',data:{endpointType,isOnchain,type},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C'})}).catch(()=>{});
    // #endregion
    const payload: TEEPayloadDisclose = {
      type,
      endpointType: endpointType,
      endpoint: endpoint,
      onchain: isOnchain,
      circuit: {
        name: circuitName,
        inputs: JSON.stringify(inputs),
      },
      version,
      userDefinedData,
      selfDefinedData,
    };
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c221fb1a-a001-4333-87b7-a57e506cd0d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'proving.ts:getPayload:return',message:'TEEPayloadDisclose built',data:{payloadType:payload.type,payloadEndpointType:payload.endpointType,payloadOnchain:payload.onchain,payloadVersion:payload.version,circuitName:payload.circuit.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
    // #endregion
    return payload;
  } else {
    const type = circuitName === 'register_aadhaar' ? 'register_aadhaar' : circuitType;
    const payload: TEEPayload = {
      type: type as RegisterProofType | DscProofType,
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
  // Production relayer for mainnet chains and production https
  const productionTypes: EndpointType[] = ['celo', 'https', 'base', 'gnosis', 'optimism'];
  return productionTypes.includes(endpointType) ? WS_DB_RELAYER : WS_DB_RELAYER_STAGING;
}
