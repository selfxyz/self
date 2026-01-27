// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AnyActorRef, AnyEventObject, StateFrom } from 'xstate';

import { ProofEvents } from '../../constants/analytics';
import { markCurrentDocumentAsRegistered } from '../../documents/utils';
import { SdkEvents } from '../../types/events';
import type { SelfClient } from '../../types/public';
import type { ProvingMachineCircuitType, ProvingState, ProvingStateType } from '../types';
import { PROVING_STATES } from './constants';
import { createProofContext } from './helpers';
import type { provingMachine } from './stateMachine';

type ActorSubscriptionState = Pick<
  ProvingState,
  | 'circuitType'
  | 'userConfirmed'
  | 'error_code'
  | 'reason'
  | 'parseIDDocument'
  | 'startFetchingData'
  | 'validatingDocument'
  | 'initTeeConnection'
  | 'startProving'
  | 'postProving'
  | '_handleRegisterErrorOrFailure'
  | '_handlePassportNotSupported'
  | '_handleAccountRecoveryChoice'
  | '_handleAccountVerifiedSuccess'
  | '_handlePassportDataNotFound'
>;

export type ActorSubscriptionDeps = {
  getState: () => ActorSubscriptionState;
  setState: (partial: Partial<ProvingState>) => void;
};

/**
 * Setup actor subscriptions for state transitions
 */
export function setupActorSubscriptions(actor: AnyActorRef, selfClient: SelfClient, deps: ActorSubscriptionDeps): void {
  const { getState, setState } = deps;
  let lastTransition = Date.now();
  let lastEvent: AnyEventObject = { type: 'init' };

  actor.on('*', (event: AnyEventObject) => {
    lastEvent = event;
  });

  actor.subscribe((state: StateFrom<typeof provingMachine>) => {
    const now = Date.now();
    const context = createProofContext(selfClient, 'stateTransition', {
      currentState: String(state.value),
    });
    selfClient.emit(SdkEvents.PROOF_EVENT, {
      context,
      level: 'info',
      event: `state transition: ${state.value}`,
      details: {
        event: lastEvent.type,
        duration_ms: now - lastTransition,
      },
    });
    lastTransition = now;
    selfClient.trackEvent(ProofEvents.PROVING_STATE_CHANGE, {
      state: state.value,
    });
    setState({ currentState: state.value as ProvingStateType });

    const currentState = getState();

    // State transition handlers
    if (state.value === PROVING_STATES.PARSING_ID_DOCUMENT) {
      currentState.parseIDDocument(selfClient);
    }
    if (state.value === PROVING_STATES.FETCHING_DATA) {
      currentState.startFetchingData(selfClient);
    }
    if (state.value === PROVING_STATES.VALIDATING_DOCUMENT) {
      currentState.validatingDocument(selfClient);
    }
    if (state.value === PROVING_STATES.init_tee_connexion) {
      currentState.initTeeConnection(selfClient);
    }
    if (state.value === PROVING_STATES.READY_TO_PROVE && currentState.userConfirmed) {
      currentState.startProving(selfClient);
    }
    if (state.value === PROVING_STATES.POST_PROVING) {
      currentState.postProving(selfClient);
    }

    // Error handling
    if (
      currentState.circuitType !== 'disclose' &&
      (state.value === PROVING_STATES.ERROR || state.value === PROVING_STATES.FAILURE)
    ) {
      currentState._handleRegisterErrorOrFailure(selfClient);
    }

    // Completion handling
    if (state.value === PROVING_STATES.COMPLETED) {
      selfClient.trackEvent(ProofEvents.PROOF_COMPLETED, {
        circuitType: currentState.circuitType,
      });

      // Mark document as registered onChain
      if (currentState.circuitType === 'register') {
        (async () => {
          try {
            await markCurrentDocumentAsRegistered(selfClient);
          } catch (error) {
            //This will be checked and updated when the app launches the next time
            console.error('Error marking document as registered:', error);
          }
        })();
      }

      if (currentState.circuitType !== 'disclose') {
        currentState._handleAccountVerifiedSuccess(selfClient);
      }

      if (currentState.circuitType === 'disclose') {
        selfClient.getSelfAppState().handleProofResult(true);
      }

      // Disable keychain error modal when proving flow ends
      selfClient.navigation?.disableKeychainErrorModal?.();
    }

    // Final state handlers
    if (state.value === PROVING_STATES.PASSPORT_NOT_SUPPORTED) {
      currentState._handlePassportNotSupported(selfClient);
    }

    if (state.value === PROVING_STATES.ACCOUNT_RECOVERY_CHOICE) {
      currentState._handleAccountRecoveryChoice(selfClient);
    }

    if (state.value === PROVING_STATES.PASSPORT_DATA_NOT_FOUND) {
      currentState._handlePassportDataNotFound(selfClient);
    }

    if (state.value === PROVING_STATES.FAILURE) {
      if (currentState.circuitType === 'disclose') {
        const { error_code, reason } = currentState;
        selfClient.getSelfAppState().handleProofResult(false, error_code ?? undefined, reason ?? undefined);
      }
    }

    if (state.value === PROVING_STATES.ERROR) {
      if (currentState.circuitType === 'disclose') {
        selfClient.getSelfAppState().handleProofResult(false, 'error', 'error');
      }
      // Disable keychain error modal when proving flow ends
      selfClient.navigation?.disableKeychainErrorModal?.();
    }
  });
}
