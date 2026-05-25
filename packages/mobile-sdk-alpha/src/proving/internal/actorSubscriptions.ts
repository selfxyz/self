// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AnyActorRef, AnyEventObject, StateFrom } from 'xstate';

import {
  completeOnboardingAttempt,
  failOnboardingAttempt,
  recoverOnboardingAttempt,
  trackOnboardingStep,
} from '../../analytics/onboardingFunnel';
import { OnboardingEvents, ProofEvents } from '../../constants/analytics';
import { markCurrentDocumentAsRegistered } from '../../documents/utils';
import { SdkEvents } from '../../types/events';
import type { SelfClient } from '../../types/public';
import type { ProvingStateType } from '../types';
import type { ProvingDependencies, ProvingStateWithMethods } from './dependencyFactory';
import { createProofContext } from './helpers';
import type { provingMachine } from './stateMachine';
import { handleRegisterErrorOrFailure } from './websocketHandlers';

export function setupActorSubscriptions(newActor: AnyActorRef, selfClient: SelfClient, deps: ProvingDependencies) {
  const get = deps.get;
  const set = deps.set;

  let lastTransition = Date.now();
  let lastEvent: AnyEventObject = { type: 'init' };

  const emitVerificationComplete = (success: boolean, error?: { code: string; message: string }) => {
    const selfApp = selfClient.getSelfAppState().selfApp;
    const provingState = get();

    selfClient.emit(SdkEvents.VERIFICATION_COMPLETE, {
      success,
      userId: selfApp?.userId,
      verificationId: provingState.uuid ?? undefined,
      error,
    });
  };

  newActor.on('*', (event: AnyEventObject) => {
    lastEvent = event;
  });
  newActor.subscribe((state: StateFrom<typeof provingMachine>) => {
    const runTask = (taskName: string, task: Promise<unknown>) => {
      void task.catch(error => {
        const errorContext = createProofContext(selfClient, 'stateTransition', {
          currentState: String(state.value),
        });
        selfClient.logProofEvent('error', 'State handler failed', errorContext, {
          failure: 'PROOF_FAILED_INTERNAL',
          task: taskName,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    };

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
    set({ currentState: state.value as ProvingStateType });

    if (state.value === 'parsing_id_document') {
      runTask('parseIDDocument', (get() as ProvingStateWithMethods).parseIDDocument(selfClient));
    }
    if (state.value === 'fetching_data') {
      runTask('startFetchingData', (get() as ProvingStateWithMethods).startFetchingData(selfClient));
    }
    if (state.value === 'validating_document') {
      runTask('validatingDocument', (get() as ProvingStateWithMethods).validatingDocument(selfClient));
    }

    if (state.value === 'init_tee_connexion') {
      runTask('initTeeConnection', (get() as ProvingStateWithMethods).initTeeConnection(selfClient));
    }

    if (state.value === 'ready_to_prove' && get().userConfirmed) {
      runTask('startProving', (get() as ProvingStateWithMethods).startProving(selfClient));
    }

    if (state.value === 'proving' && get().circuitType === 'register') {
      trackOnboardingStep(selfClient, OnboardingEvents.PROOF_STARTED);
    }

    if (state.value === 'post_proving') {
      if (get().circuitType === 'register') {
        set({ didNewRegistrationProof: true });
      }
      (get() as ProvingStateWithMethods).postProving(selfClient);
    }

    if (get().circuitType !== 'disclose' && (state.value === 'error' || state.value === 'failure')) {
      handleRegisterErrorOrFailure(selfClient);
    }

    if (state.value === 'completed') {
      selfClient.trackEvent(ProofEvents.PROOF_COMPLETED, {
        circuitType: get().circuitType,
      });

      // Mark document as registered onChain
      if (get().circuitType === 'register') {
        (async () => {
          try {
            await markCurrentDocumentAsRegistered(selfClient);
          } catch (error) {
            //This will be checked and updated when the app launches the next time
            console.error('Error marking document as registered:', error);
          }
        })();
      }

      if (get().circuitType !== 'disclose') {
        (get() as ProvingStateWithMethods)._handleAccountVerifiedSuccess(selfClient);
      }

      if (get().circuitType === 'disclose') {
        selfClient.getSelfAppState().handleProofResult(true);
      }

      if (get().circuitType === 'register' && get().didNewRegistrationProof) {
        trackOnboardingStep(selfClient, OnboardingEvents.PROOF_SUCCEEDED);
        completeOnboardingAttempt(selfClient);
      } else if (get().circuitType === 'register' && !get().didNewRegistrationProof) {
        recoverOnboardingAttempt(selfClient);
      }

      emitVerificationComplete(true);

      // Disable keychain error modal when proving flow ends
      selfClient.navigation?.disableKeychainErrorModal?.();
    }

    if (state.value === 'passport_not_supported') {
      (get() as ProvingStateWithMethods)._handlePassportNotSupported(selfClient);
    }

    if (state.value === 'account_recovery_choice') {
      (get() as ProvingStateWithMethods)._handleAccountRecoveryChoice(selfClient);
    }

    if (state.value === 'passport_data_not_found') {
      (get() as ProvingStateWithMethods)._handlePassportDataNotFound(selfClient);
    }

    if (state.value === 'failure') {
      const { error_code, reason } = get();

      if (get().circuitType === 'disclose') {
        selfClient.getSelfAppState().handleProofResult(false, error_code ?? undefined, reason ?? undefined);
      } else if (get().circuitType !== null) {
        failOnboardingAttempt(selfClient, 'proof_generation_started', reason ?? error_code ?? 'proof_failure', {
          recoverable: false,
          proof_type: get().circuitType,
        });
      }

      emitVerificationComplete(false, {
        code: error_code ?? 'proof_failure',
        message: reason ?? 'Proof verification failed',
      });
    }
    if (state.value === 'error') {
      if (get().circuitType === 'disclose') {
        selfClient.getSelfAppState().handleProofResult(false, 'error', 'error');
      } else if (get().circuitType !== null) {
        failOnboardingAttempt(selfClient, 'proof_generation_started', get().reason ?? get().error_code ?? 'error', {
          recoverable: true,
          proof_type: get().circuitType,
        });
      }

      emitVerificationComplete(false, {
        code: get().error_code ?? 'error',
        message: get().reason ?? 'Unexpected proving error',
      });

      // Disable keychain error modal when proving flow ends
      selfClient.navigation?.disableKeychainErrorModal?.();
    }
  });
}
