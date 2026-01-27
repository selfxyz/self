// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import forge from 'node-forge';

import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
import type { EndpointType, SelfApp } from '@selfxyz/common/utils';
import { getSolidityPackedUserContextData } from '@selfxyz/common/utils';
import {
  generateTEEInputsDiscloseStateless,
  generateTEEInputsDSC,
  generateTEEInputsRegister,
} from '@selfxyz/common/utils/circuits/registerInputs';
import { encryptAES256GCM, getPayload } from '@selfxyz/common/utils/proving';
import type { IDDocument } from '@selfxyz/common/utils/types';

import { ProofEvents } from '../../constants/analytics';
import type { SelfClient } from '../../types/public';
import type { ProvingMachineCircuitType, ProvingState } from '../types';
import type { ProofContext } from './logging';

const JSONRPC_VERSION = '2.0' as const;
const SUBMIT_METHOD = 'openpassport_submit_request' as const;
const SUBMIT_ID = 2 as const;

export type EncryptedPayload = {
  nonce: number[];
  cipher_text: number[];
  auth_tag: number[];
};

export type PayloadDeps = {
  getState: () => PayloadState;
  setState: (partial: Partial<PayloadState>) => void;
  createProofContext: (stage: string, overrides?: Partial<ProofContext>) => ProofContext;
};

type PayloadState = Pick<
  ProvingState,
  'circuitType' | 'passportData' | 'secret' | 'uuid' | 'sharedKey' | 'env' | 'endpointType'
>;

export type SubmitRequest = {
  jsonrpc: typeof JSONRPC_VERSION;
  method: typeof SUBMIT_METHOD;
  id: typeof SUBMIT_ID;
  params: { uuid: string | null } & EncryptedPayload;
};

export const _buildSubmitRequest = (uuid: string | null, encryptedPayload: EncryptedPayload): SubmitRequest => {
  return {
    jsonrpc: JSONRPC_VERSION,
    method: SUBMIT_METHOD,
    id: SUBMIT_ID,
    params: {
      uuid: uuid,
      ...encryptedPayload,
    },
  };
};

export const _encryptPayload = (payload: unknown, sharedKey: Buffer): EncryptedPayload => {
  const forgeKey = forge.util.createBuffer(sharedKey.toString('binary'));
  return encryptAES256GCM(JSON.stringify(payload), forgeKey);
};

export const _generateCircuitInputs = async (
  selfClient: SelfClient,
  circuitType: ProvingMachineCircuitType,
  secret: string | undefined | null,
  passportData: IDDocument,
  env: 'prod' | 'stg',
  selfApp: SelfApp | null,
) => {
  const document: DocumentCategory = passportData.documentCategory;
  const protocolStore = selfClient.getProtocolState();

  let inputs, circuitName, endpointType, endpoint, circuitTypeWithDocumentExtension;
  switch (circuitType) {
    case 'register':
      ({ inputs, circuitName, endpointType, endpoint } = await generateTEEInputsRegister(
        secret as string,
        passportData,
        document === 'aadhaar' ? protocolStore[document].public_keys : protocolStore[document].dsc_tree,
        env,
      ));
      circuitTypeWithDocumentExtension = `${circuitType}${document === 'passport' ? '' : '_id'}`;
      break;
    case 'dsc':
      if (document === 'aadhaar') {
        throw new Error('DSC circuit type is not supported for Aadhaar documents');
      }
      ({ inputs, circuitName, endpointType, endpoint } = generateTEEInputsDSC(
        passportData as PassportData,
        protocolStore[document].csca_tree as string[][],
        env,
      ));
      circuitTypeWithDocumentExtension = `${circuitType}${document === 'passport' ? '' : '_id'}`;
      break;
    case 'disclose': {
      if (!selfApp) {
        throw new Error('SelfApp context not initialized');
      }
      ({ inputs, circuitName, endpointType, endpoint } = generateTEEInputsDiscloseStateless(
        secret as string,
        passportData,
        selfApp,
        (doc: DocumentCategory, tree) => {
          const docStore =
            doc === 'passport'
              ? protocolStore.passport
              : doc === 'aadhaar'
                ? protocolStore.aadhaar
                : protocolStore.id_card;
          switch (tree) {
            case 'ofac':
              return docStore.ofac_trees;
            case 'commitment':
              if (!docStore.commitment_tree) {
                throw new Error('Commitment tree not loaded');
              }
              return docStore.commitment_tree;
            default:
              throw new Error('Unknown tree type');
          }
        },
      ));
      circuitTypeWithDocumentExtension = `disclose`;
      break;
    }
    default:
      throw new Error('Invalid circuit type:' + circuitType);
  }

  return {
    inputs,
    circuitName,
    endpointType,
    endpoint,
    circuitTypeWithDocumentExtension,
  };
};

export const _generatePayload = async (selfClient: SelfClient, deps: PayloadDeps) => {
  const startTime = Date.now();
  const { getState, setState, createProofContext } = deps;
  const { circuitType, passportData, secret, uuid, sharedKey, env } = getState();
  const context = createProofContext('_generatePayload', {
    sessionId: uuid || 'unknown-session',
    circuitType: circuitType || null,
  });
  selfClient.logProofEvent('info', 'Payload generation started', context);

  try {
    if (!passportData) {
      throw new Error('PassportData is not available');
    }
    if (!env) {
      throw new Error('Environment not set');
    }
    if (!sharedKey) {
      throw new Error('Shared key not available');
    }

    const { inputs, circuitName, endpointType, endpoint, circuitTypeWithDocumentExtension } =
      await _generateCircuitInputs(
        selfClient,
        circuitType as ProvingMachineCircuitType,
        secret,
        passportData,
        env,
        selfClient.getSelfAppState().selfApp,
      );

    selfClient.logProofEvent('info', 'Inputs generated', context, {
      circuit_name: circuitName,
      endpoint_type: endpointType,
    });

    const selfApp = selfClient.getSelfAppState().selfApp;
    const userDefinedData = getSolidityPackedUserContextData(
      selfApp?.chainID ?? 0,
      selfApp?.userId ?? '',
      selfApp?.userDefinedData ?? '',
    ).slice(2);

    const payload = getPayload(
      inputs,
      circuitTypeWithDocumentExtension as 'register_id' | 'dsc_id' | 'register' | 'dsc',
      circuitName as string,
      endpointType as EndpointType,
      endpoint as string,
      selfApp?.version,
      userDefinedData,
      selfApp?.selfDefinedData ?? '',
    );

    const payloadSize = JSON.stringify(payload).length;

    const encryptedPayload = _encryptPayload(payload, sharedKey);

    selfClient.logProofEvent('info', 'Payload encrypted', context, {
      payload_size: payloadSize,
    });

    selfClient.trackEvent(ProofEvents.PAYLOAD_GEN_COMPLETED);
    selfClient.trackEvent(ProofEvents.PAYLOAD_ENCRYPTED);

    setState({ endpointType: endpointType as EndpointType });

    selfClient.logProofEvent('info', 'Payload generation completed', context, {
      duration_ms: Date.now() - startTime,
    });

    return _buildSubmitRequest(uuid!, encryptedPayload);
  } catch (error) {
    selfClient.logProofEvent('error', 'Payload generation failed', context, {
      failure: 'PROOF_FAILED_PAYLOAD_GEN',
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    });
    throw error;
  }
};
