import { ethers } from 'ethers';

import { initElliptic } from '../certificates/parsing/elliptic.js';
import { IDENTITY_VERIFICATION_HUB_ADDRESS } from '../foundation/constants/identity.js';
import { RPC_URL, WS_DB_RELAYER, WS_DB_RELAYER_STAGING } from '../foundation/constants/network.js';
import type { EndpointType } from '../foundation/types/app.js';
import type {
  DiscloseProofType,
  DscProofType,
  RegisterProofType,
  TEEPayload,
  TEEPayloadDisclose,
} from '../foundation/types/attestation.js';

const elliptic = initElliptic();
const { ec: EC } = elliptic;

export const ec = new EC('p256');
export const clientKey = ec.genKeyPair();
export const clientPublicKeyHex = clientKey.getPublic(true, 'hex');

function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function getPayload(
  inputs: any,
  circuitType: RegisterProofType | DscProofType | DiscloseProofType,
  circuitName: string,
  endpointType: EndpointType,
  endpoint: string,
  version: number = 1,
  userDefinedData: string = '',
  selfDefinedData: string = '',
) {
  if (circuitType === 'disclose') {
    const type =
      circuitName === 'vc_and_disclose'
        ? 'disclose'
        : circuitName === 'vc_and_disclose_aadhaar'
          ? 'disclose_aadhaar'
          : circuitName === 'vc_and_disclose_kyc'
            ? 'disclose_kyc'
            : 'disclose_id';
    const payload: TEEPayloadDisclose = {
      type,
      endpointType: endpointType,
      endpoint: endpoint,
      onchain: endpointType === 'celo' ? true : false,
      circuit: {
        name: circuitName,
        inputs: JSON.stringify(inputs, bigIntReplacer),
      },
      version,
      userDefinedData,
      selfDefinedData,
    };
    return payload;
  } else {
    const payload: TEEPayload = {
      type: circuitType as RegisterProofType | DscProofType,
      onchain: true,
      endpointType: endpointType,
      circuit: {
        name: circuitName,
        inputs: JSON.stringify(inputs, bigIntReplacer),
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

export async function getAadharRegistrationWindow() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const identityVerificationHub = new ethers.Contract(
      IDENTITY_VERIFICATION_HUB_ADDRESS,
      ['function AADHAAR_REGISTRATION_WINDOW() view returns (uint256)'],
      provider,
    );
    const aadharRegistrationWindow =
      await identityVerificationHub.AADHAAR_REGISTRATION_WINDOW();
    return aadharRegistrationWindow;
  } catch (error) {
    console.warn('Failed to get aadhar registration window:', error);
    return 120;
  }
}
