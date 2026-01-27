// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';

import { PROVING_EVENTS, PROVING_STATES } from '../../../src/proving/internal/constants';
import { provingMachine } from '../../../src/proving/internal/stateMachine';

describe('provingMachine', () => {
  describe('initial state', () => {
    it('starts in idle state', () => {
      const actor = createActor(provingMachine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.IDLE);

      actor.stop();
    });
  });

  describe('happy path state transitions', () => {
    it('transitions from idle to parsing_id_document on PARSE_ID_DOCUMENT', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.PARSE_ID_DOCUMENT });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.PARSING_ID_DOCUMENT);

      actor.stop();
    });

    it('transitions from idle to fetching_data on FETCH_DATA', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.FETCHING_DATA);

      actor.stop();
    });

    it('transitions from parsing_id_document to fetching_data on PARSE_SUCCESS', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.PARSE_ID_DOCUMENT });
      actor.send({ type: PROVING_EVENTS.PARSE_SUCCESS });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.FETCHING_DATA);

      actor.stop();
    });

    it('transitions from fetching_data to validating_document on FETCH_SUCCESS', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.VALIDATING_DOCUMENT);

      actor.stop();
    });

    it('transitions from validating_document to init_tee_connexion on VALIDATION_SUCCESS', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.init_tee_connexion);

      actor.stop();
    });

    it('transitions from init_tee_connexion to ready_to_prove on CONNECT_SUCCESS', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_SUCCESS });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.READY_TO_PROVE);

      actor.stop();
    });

    it('transitions from ready_to_prove to proving on START_PROVING', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_SUCCESS });
      actor.send({ type: PROVING_EVENTS.START_PROVING });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.PROVING);

      actor.stop();
    });

    it('transitions from proving to post_proving on PROVE_SUCCESS', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_SUCCESS });
      actor.send({ type: PROVING_EVENTS.START_PROVING });
      actor.send({ type: PROVING_EVENTS.PROVE_SUCCESS });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.POST_PROVING);

      actor.stop();
    });

    it('transitions from post_proving to completed on COMPLETED', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_SUCCESS });
      actor.send({ type: PROVING_EVENTS.START_PROVING });
      actor.send({ type: PROVING_EVENTS.PROVE_SUCCESS });
      actor.send({ type: PROVING_EVENTS.COMPLETED });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.COMPLETED);

      actor.stop();
    });

    it('completes full happy path flow', () => {
      const actor = createActor(provingMachine);

      // Track state transitions - subscribe BEFORE start to capture initial state
      const states: string[] = [];
      actor.subscribe(state => {
        states.push(state.value as string);
      });

      actor.start();

      // Execute full flow
      actor.send({ type: PROVING_EVENTS.PARSE_ID_DOCUMENT });
      actor.send({ type: PROVING_EVENTS.PARSE_SUCCESS });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_SUCCESS });
      actor.send({ type: PROVING_EVENTS.START_PROVING });
      actor.send({ type: PROVING_EVENTS.PROVE_SUCCESS });
      actor.send({ type: PROVING_EVENTS.COMPLETED });

      expect(states).toEqual([
        PROVING_STATES.IDLE,
        PROVING_STATES.PARSING_ID_DOCUMENT,
        PROVING_STATES.FETCHING_DATA,
        PROVING_STATES.VALIDATING_DOCUMENT,
        PROVING_STATES.init_tee_connexion,
        PROVING_STATES.READY_TO_PROVE,
        PROVING_STATES.PROVING,
        PROVING_STATES.POST_PROVING,
        PROVING_STATES.COMPLETED,
      ]);

      actor.stop();
    });
  });

  describe('error transitions', () => {
    it('transitions from idle to error on ERROR', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.ERROR });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.ERROR);

      actor.stop();
    });

    it('transitions from parsing_id_document to error on PARSE_ERROR', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.PARSE_ID_DOCUMENT });
      actor.send({ type: PROVING_EVENTS.PARSE_ERROR });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.ERROR);

      actor.stop();
    });

    it('transitions from fetching_data to error on FETCH_ERROR', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_ERROR });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.ERROR);

      actor.stop();
    });

    it('transitions from validating_document to error on VALIDATION_ERROR', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_ERROR });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.ERROR);

      actor.stop();
    });

    it('transitions from init_tee_connexion to error on CONNECT_ERROR', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_ERROR });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.ERROR);

      actor.stop();
    });

    it('transitions from ready_to_prove to error on PROVE_ERROR', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_SUCCESS });
      actor.send({ type: PROVING_EVENTS.PROVE_ERROR });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.ERROR);

      actor.stop();
    });

    it('transitions from proving to error on PROVE_ERROR', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_SUCCESS });
      actor.send({ type: PROVING_EVENTS.START_PROVING });
      actor.send({ type: PROVING_EVENTS.PROVE_ERROR });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.ERROR);

      actor.stop();
    });
  });

  describe('failure transitions', () => {
    it('transitions from proving to failure on PROVE_FAILURE', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_SUCCESS });
      actor.send({ type: PROVING_EVENTS.START_PROVING });
      actor.send({ type: PROVING_EVENTS.PROVE_FAILURE });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.FAILURE);

      actor.stop();
    });
  });

  describe('special state transitions', () => {
    it('transitions from idle to passport_data_not_found on PASSPORT_DATA_NOT_FOUND', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.PASSPORT_DATA_NOT_FOUND });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.PASSPORT_DATA_NOT_FOUND);

      actor.stop();
    });

    it('transitions from validating_document to completed on ALREADY_REGISTERED', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.ALREADY_REGISTERED });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.COMPLETED);

      actor.stop();
    });

    it('transitions from validating_document to passport_not_supported on PASSPORT_NOT_SUPPORTED', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.PASSPORT_NOT_SUPPORTED });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.PASSPORT_NOT_SUPPORTED);

      actor.stop();
    });

    it('transitions from validating_document to account_recovery_choice on ACCOUNT_RECOVERY_CHOICE', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.ACCOUNT_RECOVERY_CHOICE });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.ACCOUNT_RECOVERY_CHOICE);

      actor.stop();
    });

    it('transitions from validating_document to passport_data_not_found on PASSPORT_DATA_NOT_FOUND', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.PASSPORT_DATA_NOT_FOUND });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.PASSPORT_DATA_NOT_FOUND);

      actor.stop();
    });

    it('transitions from post_proving to fetching_data on SWITCH_TO_REGISTER', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_SUCCESS });
      actor.send({ type: PROVING_EVENTS.START_PROVING });
      actor.send({ type: PROVING_EVENTS.PROVE_SUCCESS });
      actor.send({ type: PROVING_EVENTS.SWITCH_TO_REGISTER });

      expect(actor.getSnapshot().value).toBe(PROVING_STATES.FETCHING_DATA);

      actor.stop();
    });
  });

  describe('final states', () => {
    it('marks completed as a final state', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.ALREADY_REGISTERED });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe(PROVING_STATES.COMPLETED);
      expect(snapshot.status).toBe('done');

      actor.stop();
    });

    it('marks error as a final state', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.ERROR });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe(PROVING_STATES.ERROR);
      expect(snapshot.status).toBe('done');

      actor.stop();
    });

    it('marks failure as a final state', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.VALIDATION_SUCCESS });
      actor.send({ type: PROVING_EVENTS.CONNECT_SUCCESS });
      actor.send({ type: PROVING_EVENTS.START_PROVING });
      actor.send({ type: PROVING_EVENTS.PROVE_FAILURE });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe(PROVING_STATES.FAILURE);
      expect(snapshot.status).toBe('done');

      actor.stop();
    });

    it('marks passport_not_supported as a final state', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.PASSPORT_NOT_SUPPORTED });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe(PROVING_STATES.PASSPORT_NOT_SUPPORTED);
      expect(snapshot.status).toBe('done');

      actor.stop();
    });

    it('marks account_recovery_choice as a final state', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.FETCH_DATA });
      actor.send({ type: PROVING_EVENTS.FETCH_SUCCESS });
      actor.send({ type: PROVING_EVENTS.ACCOUNT_RECOVERY_CHOICE });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe(PROVING_STATES.ACCOUNT_RECOVERY_CHOICE);
      expect(snapshot.status).toBe('done');

      actor.stop();
    });

    it('marks passport_data_not_found as a final state', () => {
      const actor = createActor(provingMachine);
      actor.start();

      actor.send({ type: PROVING_EVENTS.PASSPORT_DATA_NOT_FOUND });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe(PROVING_STATES.PASSPORT_DATA_NOT_FOUND);
      expect(snapshot.status).toBe('done');

      actor.stop();
    });
  });
});
