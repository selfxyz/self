// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AnyActorRef } from 'xstate';

import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
import { getSKIPEM, initPassportDataParsing } from '@selfxyz/common/utils';
import {
  checkDocumentSupported,
  checkIfPassportDscIsInTree,
  isDocumentNullified,
  isUserRegistered,
  isUserRegisteredWithAlternativeCSCA,
} from '@selfxyz/common/utils/passports/validate';

import { PassportEvents, ProofEvents } from '../../constants/analytics';
import {
  clearPassportData,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
  storePassportData,
} from '../../documents/utils';
import { fetchAllTreesAndCircuits, getCommitmentTree } from '../../stores';
import type { SelfClient } from '../../types/public';
import type { ProvingState } from '../provingMachine';
import type { ProofContext } from './logging';

type DocumentProcessorState = Pick<
  ProvingState,
  'passportData' | 'env' | 'circuitType' | 'secret' | 'endpointType' | 'currentState'
>;

export type DocumentProcessorDeps = {
  getState: () => DocumentProcessorState;
  setState: (partial: Partial<DocumentProcessorState>) => void;
  getActor: () => AnyActorRef | null;
  createProofContext: (stage: string, overrides?: Partial<ProofContext>) => ProofContext;
};

export const parseIDDocument = async (selfClient: SelfClient, deps: DocumentProcessorDeps) => {
  const { getState, setState, getActor, createProofContext } = deps;
  const actor = getActor();
  if (!actor) {
    throw new Error('State machine not initialized. Call init() first.');
  }
  const startTime = Date.now();
  const context = createProofContext('parseIDDocument');
  selfClient.logProofEvent('info', 'Parsing ID document started', context);

  try {
    const { passportData, env } = getState();
    if (!passportData) {
      throw new Error('PassportData is not available');
    }

    selfClient.logProofEvent('info', 'ID document parsing process started', context);

    const skiPem = await getSKIPEM(env === 'stg' ? 'staging' : 'production');
    const parsedPassportData = initPassportDataParsing(passportData as PassportData, skiPem);
    if (!parsedPassportData) {
      throw new Error('Failed to parse passport data');
    }

    const passportMetadata = parsedPassportData.passportMetadata!;
    let dscObject;
    try {
      dscObject = { dsc: passportMetadata.dsc };
    } catch (error) {
      console.error('Failed to parse dsc:', error);
      dscObject = {};
    }

    selfClient.trackEvent(PassportEvents.PASSPORT_PARSED, {
      success: true,
      data_groups: passportMetadata.dataGroups,
      dg1_size: passportMetadata.dg1Size,
      dg1_hash_size: passportMetadata.dg1HashSize,
      dg1_hash_function: passportMetadata.dg1HashFunction,
      dg1_hash_offset: passportMetadata.dg1HashOffset,
      dg_padding_bytes: passportMetadata.dgPaddingBytes,
      e_content_size: passportMetadata.eContentSize,
      e_content_hash_function: passportMetadata.eContentHashFunction,
      e_content_hash_offset: passportMetadata.eContentHashOffset,
      signed_attr_size: passportMetadata.signedAttrSize,
      signed_attr_hash_function: passportMetadata.signedAttrHashFunction,
      signature_algorithm: passportMetadata.signatureAlgorithm,
      salt_length: passportMetadata.saltLength,
      curve_or_exponent: passportMetadata.curveOrExponent,
      signature_algorithm_bits: passportMetadata.signatureAlgorithmBits,
      country_code: passportMetadata.countryCode,
      csca_found: passportMetadata.cscaFound,
      csca_hash_function: passportMetadata.cscaHashFunction,
      csca_signature_algorithm: passportMetadata.cscaSignatureAlgorithm,
      csca_salt_length: passportMetadata.cscaSaltLength,
      csca_curve_or_exponent: passportMetadata.cscaCurveOrExponent,
      csca_signature_algorithm_bits: passportMetadata.cscaSignatureAlgorithmBits,
      dsc: dscObject,
      dsc_aki: (passportData as PassportData).dsc_parsed?.authorityKeyIdentifier,
      dsc_ski: (passportData as PassportData).dsc_parsed?.subjectKeyIdentifier,
    });
    console.log('passport data parsed successfully, storing in keychain');
    await storePassportData(selfClient, parsedPassportData);
    console.log('passport data stored in keychain');

    setState({ passportData: parsedPassportData });
    selfClient.logProofEvent('info', 'ID document parsing succeeded', context, {
      duration_ms: Date.now() - startTime,
    });
    actor.send({ type: 'PARSE_SUCCESS' });
  } catch (error) {
    selfClient.logProofEvent('error', 'ID document parsing failed', context, {
      failure: 'PROOF_FAILED_PARSING',
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    });
    console.error('Error parsing ID document:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    selfClient.trackEvent(PassportEvents.PASSPORT_PARSE_FAILED, {
      error: errMsg,
    });
    getActor()?.send({ type: 'PARSE_ERROR' });
  }
};

export const startFetchingData = async (selfClient: SelfClient, deps: DocumentProcessorDeps) => {
  const { getState, getActor, createProofContext } = deps;
  const actor = getActor();
  if (!actor) {
    throw new Error('State machine not initialized. Call init() first.');
  }
  selfClient.trackEvent(ProofEvents.FETCH_DATA_STARTED);
  const startTime = Date.now();
  const context = createProofContext('startFetchingData');
  selfClient.logProofEvent('info', 'Fetching DSC data started', context);
  try {
    const { passportData, env } = getState();
    if (!passportData) {
      throw new Error('PassportData is not available');
    }
    const document: DocumentCategory = passportData.documentCategory;
    console.log('document', document);
    switch (passportData.documentCategory) {
      case 'passport':
      case 'id_card':
        if (!passportData?.dsc_parsed) {
          selfClient.logProofEvent('error', 'Missing parsed DSC', context, {
            failure: 'PROOF_FAILED_DATA_FETCH',
            duration_ms: Date.now() - startTime,
          });
          console.error('Missing parsed DSC in passport data');
          selfClient.trackEvent(ProofEvents.FETCH_DATA_FAILED, {
            message: 'Missing parsed DSC in passport data',
          });
          actor.send({ type: 'FETCH_ERROR' });
          return;
        }
        selfClient.logProofEvent('info', 'Protocol store fetch', context, {
          step: 'protocol_store_fetch',
          document,
        });
        await fetchAllTreesAndCircuits(selfClient, document, env!, passportData.dsc_parsed!.authorityKeyIdentifier);
        break;
      case 'aadhaar':
        selfClient.logProofEvent('info', 'Protocol store fetch', context, {
          step: 'protocol_store_fetch',
          document,
        });
        await selfClient.getProtocolState().aadhaar.fetch_all(env!);
        break;
    }
    selfClient.logProofEvent('info', 'Data fetch succeeded', context, {
      duration_ms: Date.now() - startTime,
    });
    selfClient.trackEvent(ProofEvents.FETCH_DATA_SUCCESS);
    actor.send({ type: 'FETCH_SUCCESS' });
  } catch (error) {
    selfClient.logProofEvent('error', 'Data fetch failed', context, {
      failure: 'PROOF_FAILED_DATA_FETCH',
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    });
    console.error('Error fetching data:', error);
    selfClient.trackEvent(ProofEvents.FETCH_DATA_FAILED, {
      message: error instanceof Error ? error.message : String(error),
    });
    getActor()?.send({ type: 'FETCH_ERROR' });
  }
};

export const validatingDocument = async (selfClient: SelfClient, deps: DocumentProcessorDeps) => {
  const { getState, setState, getActor, createProofContext } = deps;
  const actor = getActor();
  if (!actor) {
    throw new Error('State machine not initialized. Call init() first.');
  }
  selfClient.trackEvent(ProofEvents.VALIDATION_STARTED);
  const startTime = Date.now();
  const context = createProofContext('validatingDocument');
  selfClient.logProofEvent('info', 'Validating document started', context);
  try {
    const { passportData, secret, circuitType } = getState();
    if (!passportData) {
      throw new Error('PassportData is not available');
    }
    const isSupported = await checkDocumentSupported(passportData, {
      getDeployedCircuits: (documentCategory: DocumentCategory) =>
        selfClient.getProtocolState()[documentCategory].deployed_circuits!,
    });
    selfClient.logProofEvent('info', 'Document support check', context, {
      supported: isSupported.status === 'passport_supported',
      duration_ms: Date.now() - startTime,
    });
    if (isSupported.status !== 'passport_supported') {
      selfClient.logProofEvent('error', 'Passport not supported', context, {
        failure: 'PROOF_FAILED_VALIDATION',
        details: isSupported.details,
        duration_ms: Date.now() - startTime,
      });
      console.error('Passport not supported:', isSupported.status, isSupported.details);
      selfClient.trackEvent(PassportEvents.COMING_SOON, {
        status: isSupported.status,
        details: isSupported.details,
      });

      await clearPassportData(selfClient);

      actor.send({ type: 'PASSPORT_NOT_SUPPORTED' });
      return;
    }

    if (circuitType === 'disclose') {
      if (!secret || typeof secret !== 'string') {
        throw new Error('Secret is required and must be a string');
      }
      const isRegisteredWithLocalCSCA = await isUserRegistered(
        passportData,
        secret,
        (documentCategory: DocumentCategory) => getCommitmentTree(selfClient, documentCategory),
      );
      selfClient.logProofEvent('info', 'Local CSCA registration check', context, {
        registered: isRegisteredWithLocalCSCA,
      });
      if (isRegisteredWithLocalCSCA) {
        selfClient.logProofEvent('info', 'Validation succeeded', context, {
          duration_ms: Date.now() - startTime,
        });
        selfClient.trackEvent(ProofEvents.VALIDATION_SUCCESS);
        actor.send({ type: 'VALIDATION_SUCCESS' });
        return;
      } else {
        selfClient.logProofEvent('error', 'Passport data not found', context, {
          failure: 'PROOF_FAILED_VALIDATION',
          duration_ms: Date.now() - startTime,
        });
        actor.send({ type: 'PASSPORT_DATA_NOT_FOUND' });
        return;
      }
    } else {
      const { isRegistered, csca } = await isUserRegisteredWithAlternativeCSCA(passportData, secret as string, {
        getCommitmentTree: (docCategory: DocumentCategory) => getCommitmentTree(selfClient, docCategory),
        getAltCSCA: (docType: DocumentCategory) => {
          if (docType === 'aadhaar') {
            const publicKeys = selfClient.getProtocolState().aadhaar.public_keys;
            return publicKeys ? Object.fromEntries(publicKeys.map(key => [key, key])) : {};
          }
          return selfClient.getProtocolState()[docType].alternative_csca;
        },
      });
      selfClient.logProofEvent('info', 'Alternative CSCA registration check', context, {
        registered: isRegistered,
      });
      if (isRegistered) {
        await reStorePassportDataWithRightCSCA(selfClient, passportData, csca as string);

        (async () => {
          try {
            await markCurrentDocumentAsRegistered(selfClient);
          } catch (error) {
            console.error('Error marking document as registered:', error);
          }
        })();
        setState({ circuitType: 'register' }); // Update circuit type to 'register' to reflect full registration completion

        selfClient.trackEvent(ProofEvents.ALREADY_REGISTERED);
        selfClient.logProofEvent('info', 'Document already registered', context, {
          duration_ms: Date.now() - startTime,
        });
        actor.send({ type: 'ALREADY_REGISTERED' });
        return;
      }
      const isNullifierOnchain = await isDocumentNullified(passportData);
      selfClient.logProofEvent('info', 'Nullifier check', context, {
        nullified: isNullifierOnchain,
      });
      if (isNullifierOnchain) {
        selfClient.logProofEvent('error', 'Passport nullified', context, {
          failure: 'PROOF_FAILED_VALIDATION',
          duration_ms: Date.now() - startTime,
        });
        console.warn('Passport is nullified, but not registered with this secret. Navigating to AccountRecoveryChoice');
        selfClient.trackEvent(ProofEvents.PASSPORT_NULLIFIER_ONCHAIN);
        actor.send({ type: 'ACCOUNT_RECOVERY_CHOICE' });
        return;
      }
      const document: DocumentCategory = passportData.documentCategory;
      if (document === 'passport' || document === 'id_card') {
        const isDscRegistered = await checkIfPassportDscIsInTree(
          passportData,
          selfClient.getProtocolState()[document].dsc_tree,
        );
        selfClient.logProofEvent('info', 'DSC tree check', context, {
          dsc_registered: isDscRegistered,
        });
        if (isDscRegistered) {
          selfClient.trackEvent(ProofEvents.DSC_IN_TREE);
          setState({ circuitType: 'register' });
        }
      }
      selfClient.logProofEvent('info', 'Validation succeeded', context, {
        duration_ms: Date.now() - startTime,
      });
      selfClient.trackEvent(ProofEvents.VALIDATION_SUCCESS);
      actor.send({ type: 'VALIDATION_SUCCESS' });
    }
  } catch (error) {
    selfClient.logProofEvent('error', 'Validation failed', context, {
      failure: 'PROOF_FAILED_VALIDATION',
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    });
    console.error('Error validating passport:', error);
    selfClient.trackEvent(ProofEvents.VALIDATION_FAILED, {
      message: error instanceof Error ? error.message : String(error),
    });
    getActor()?.send({ type: 'VALIDATION_ERROR' });
  }
};
