// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Event types for the proving state machine
 */
export const PROVING_EVENTS = {
  PARSE_ID_DOCUMENT: 'PARSE_ID_DOCUMENT',
  FETCH_DATA: 'FETCH_DATA',
  ERROR: 'ERROR',
  PASSPORT_DATA_NOT_FOUND: 'PASSPORT_DATA_NOT_FOUND',
  PARSE_SUCCESS: 'PARSE_SUCCESS',
  PARSE_ERROR: 'PARSE_ERROR',
  FETCH_SUCCESS: 'FETCH_SUCCESS',
  FETCH_ERROR: 'FETCH_ERROR',
  VALIDATION_SUCCESS: 'VALIDATION_SUCCESS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ALREADY_REGISTERED: 'ALREADY_REGISTERED',
  PASSPORT_NOT_SUPPORTED: 'PASSPORT_NOT_SUPPORTED',
  ACCOUNT_RECOVERY_CHOICE: 'ACCOUNT_RECOVERY_CHOICE',
  CONNECT_SUCCESS: 'CONNECT_SUCCESS',
  CONNECT_ERROR: 'CONNECT_ERROR',
  START_PROVING: 'START_PROVING',
  PROVE_ERROR: 'PROVE_ERROR',
  PROVE_SUCCESS: 'PROVE_SUCCESS',
  PROVE_FAILURE: 'PROVE_FAILURE',
  SWITCH_TO_REGISTER: 'SWITCH_TO_REGISTER',
  COMPLETED: 'COMPLETED',
} as const;

/**
 * State names for the proving state machine
 */
export const PROVING_STATES = {
  IDLE: 'idle',
  PARSING_ID_DOCUMENT: 'parsing_id_document',
  FETCHING_DATA: 'fetching_data',
  VALIDATING_DOCUMENT: 'validating_document',
  init_tee_connexion: 'init_tee_connexion',
  LISTENING_FOR_STATUS: 'listening_for_status',
  READY_TO_PROVE: 'ready_to_prove',
  PROVING: 'proving',
  POST_PROVING: 'post_proving',
  COMPLETED: 'completed',
  ERROR: 'error',
  FAILURE: 'failure',
  PASSPORT_NOT_SUPPORTED: 'passport_not_supported',
  ACCOUNT_RECOVERY_CHOICE: 'account_recovery_choice',
  PASSPORT_DATA_NOT_FOUND: 'passport_data_not_found',
} as const;

/**
 * Timing constants
 */
export const TIMING = {
  POST_PROVING_DELAY_MS: 1500,
} as const;
