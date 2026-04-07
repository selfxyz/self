// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { ProofEvents } from '../../../src/constants/analytics';
import { markCurrentDocumentAsRegistered } from '../../../src/documents/utils';
import type { ProvingDependencies, ProvingStateWithMethods } from '../../../src/proving/internal/dependencyFactory';
import { handleRegisterErrorOrFailure } from '../../../src/proving/internal/websocketHandlers';
import { SdkEvents } from '../../../src/types/events';
import type { SelfClient } from '../../../src/types/public';
import { setupActorSubscriptions } from '../../../src/proving/internal/actorSubscriptions';
import { actorMock, emitState } from '../actorMock';

vi.mock('../../../src/documents/utils', () => ({
  markCurrentDocumentAsRegistered: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../src/proving/internal/websocketHandlers', () => ({
  handleRegisterErrorOrFailure: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../src/proving/internal/helpers', () => ({
  createProofContext: vi.fn(() => ({
    sessionId: 'session-uuid',
    userId: 'user-123',
    circuitType: 'register',
    currentState: 'idle',
    stage: 'stateTransition',
    platform: 'ios',
  })),
}));

const makeSnapshot = (overrides: Partial<ProvingStateWithMethods> = {}): ProvingStateWithMethods => ({
  currentState: 'idle' as any,
  attestation: null,
  serverPublicKey: null,
  sharedKey: null,
  wsConnection: null,
  wsHandlers: null,
  wsReconnectAttempts: 0,
  socketConnection: null as any,
  uuid: 'session-uuid',
  userConfirmed: false,
  passportData: { documentCategory: 'passport', mock: false } as any,
  secret: 'secret',
  circuitType: 'register',
  error_code: null,
  reason: null,
  endpointType: 'https' as any,
  env: 'prod',
  parseIDDocument: vi.fn(() => Promise.resolve()),
  startFetchingData: vi.fn(() => Promise.resolve()),
  validatingDocument: vi.fn(() => Promise.resolve()),
  initTeeConnection: vi.fn(() => Promise.resolve(true)),
  startProving: vi.fn(() => Promise.resolve()),
  postProving: vi.fn(),
  _closeConnections: vi.fn(),
  _handleWebSocketMessage: vi.fn(),
  _handleWsOpen: vi.fn(),
  _handleWsError: vi.fn(),
  _handleWsClose: vi.fn(),
  _reconnectTeeWebSocket: vi.fn(),
  _startSocketIOStatusListener: vi.fn(),
  _handlePassportNotSupported: vi.fn(),
  _handleAccountRecoveryChoice: vi.fn(),
  _handleAccountVerifiedSuccess: vi.fn(),
  _handlePassportDataNotFound: vi.fn(),
  ...overrides,
});

function makeSelfClient(overrides: Partial<SelfClient> = {}): SelfClient {
  return {
    emit: vi.fn(),
    trackEvent: vi.fn(),
    logProofEvent: vi.fn(),
    navigation: { disableKeychainErrorModal: vi.fn() },
    getSelfAppState: vi.fn(() => ({
      selfApp: { userId: 'user-123' },
      handleProofResult: vi.fn(),
    })),
    getProvingState: vi.fn(() => ({
      uuid: 'session-uuid',
      circuitType: 'register',
      currentState: 'idle',
    })),
    getProtocolState: vi.fn(() => ({})),
    config: { platform: 'ios', debug: false },
    ...overrides,
  } as unknown as SelfClient;
}

describe('actorSubscriptions', () => {
  let snapshot: ProvingStateWithMethods;
  let deps: ProvingDependencies;
  let selfClient: SelfClient;

  beforeEach(() => {
    vi.clearAllMocks();
    (actorMock as any)._callback = null;
    (actorMock as any)._eventHandler = null;
    snapshot = makeSnapshot();

    deps = {
      get: vi.fn(() => snapshot),
      set: vi.fn((partial: Partial<ProvingStateWithMethods>) => {
        snapshot = { ...snapshot, ...partial };
      }),
      getActor: vi.fn(() => actorMock as any),
    };

    selfClient = makeSelfClient();
  });

  describe('completed state by circuit type', () => {
    it('marks document as registered and calls _handleAccountVerifiedSuccess for register circuit', async () => {
      snapshot = makeSnapshot({ circuitType: 'register' });
      setupActorSubscriptions(actorMock as any, selfClient, deps);

      emitState('completed');

      expect(selfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.PROOF_COMPLETED, {
        circuitType: 'register',
      });
      // markCurrentDocumentAsRegistered is called async — flush microtasks
      await vi.waitFor(() => {
        expect(markCurrentDocumentAsRegistered).toHaveBeenCalledWith(selfClient);
      });
      expect(snapshot._handleAccountVerifiedSuccess).toHaveBeenCalledWith(selfClient);
      expect(selfClient.emit).toHaveBeenCalledWith(
        SdkEvents.VERIFICATION_COMPLETE,
        expect.objectContaining({ success: true }),
      );
    });

    it('calls handleProofResult for disclose circuit without marking document as registered', () => {
      const handleProofResult = vi.fn();
      selfClient = makeSelfClient({
        getSelfAppState: vi.fn(() => ({
          selfApp: { userId: 'user-123' },
          handleProofResult,
        })),
      } as any);
      snapshot = makeSnapshot({ circuitType: 'disclose' });
      setupActorSubscriptions(actorMock as any, selfClient, deps);

      emitState('completed');

      expect(handleProofResult).toHaveBeenCalledWith(true);
      expect(markCurrentDocumentAsRegistered).not.toHaveBeenCalled();
      // _handleAccountVerifiedSuccess is NOT called for disclose
      expect(snapshot._handleAccountVerifiedSuccess).not.toHaveBeenCalled();
      expect(selfClient.emit).toHaveBeenCalledWith(
        SdkEvents.VERIFICATION_COMPLETE,
        expect.objectContaining({ success: true }),
      );
    });

    it('calls _handleAccountVerifiedSuccess for dsc circuit without marking document as registered', () => {
      snapshot = makeSnapshot({ circuitType: 'dsc' });
      setupActorSubscriptions(actorMock as any, selfClient, deps);

      emitState('completed');

      expect(snapshot._handleAccountVerifiedSuccess).toHaveBeenCalledWith(selfClient);
      expect(markCurrentDocumentAsRegistered).not.toHaveBeenCalled();
    });
  });

  describe('failure and error emit VERIFICATION_COMPLETE', () => {
    it('emits VERIFICATION_COMPLETE with error on failure state', () => {
      snapshot = makeSnapshot({
        circuitType: 'disclose',
        error_code: 'proof_timeout',
        reason: 'Proof timed out',
      });
      const handleProofResult = vi.fn();
      selfClient = makeSelfClient({
        getSelfAppState: vi.fn(() => ({
          selfApp: { userId: 'user-123' },
          handleProofResult,
        })),
      } as any);
      setupActorSubscriptions(actorMock as any, selfClient, deps);

      emitState('failure');

      expect(selfClient.emit).toHaveBeenCalledWith(SdkEvents.VERIFICATION_COMPLETE, {
        success: false,
        userId: 'user-123',
        verificationId: 'session-uuid',
        error: { code: 'proof_timeout', message: 'Proof timed out' },
      });
      expect(handleProofResult).toHaveBeenCalledWith(false, 'proof_timeout', 'Proof timed out');
    });

    it('emits VERIFICATION_COMPLETE with defaults when error_code/reason are null', () => {
      snapshot = makeSnapshot({ circuitType: 'disclose', error_code: null, reason: null });
      setupActorSubscriptions(actorMock as any, selfClient, deps);

      emitState('failure');

      expect(selfClient.emit).toHaveBeenCalledWith(
        SdkEvents.VERIFICATION_COMPLETE,
        expect.objectContaining({
          success: false,
          error: { code: 'proof_failure', message: 'Proof verification failed' },
        }),
      );
    });

    it('emits VERIFICATION_COMPLETE on error state and disables keychain modal', () => {
      snapshot = makeSnapshot({ circuitType: 'register', error_code: 'ws_error', reason: 'Connection lost' });
      setupActorSubscriptions(actorMock as any, selfClient, deps);

      emitState('error');

      expect(selfClient.emit).toHaveBeenCalledWith(SdkEvents.VERIFICATION_COMPLETE, {
        success: false,
        userId: 'user-123',
        verificationId: 'session-uuid',
        error: { code: 'ws_error', message: 'Connection lost' },
      });
      expect(selfClient.navigation?.disableKeychainErrorModal).toHaveBeenCalled();
    });

    it('calls handleRegisterErrorOrFailure for non-disclose error/failure', () => {
      snapshot = makeSnapshot({ circuitType: 'register' });
      setupActorSubscriptions(actorMock as any, selfClient, deps);

      emitState('error');

      expect(handleRegisterErrorOrFailure).toHaveBeenCalledWith(selfClient);
    });

    it('does NOT call handleRegisterErrorOrFailure for disclose error', () => {
      snapshot = makeSnapshot({ circuitType: 'disclose' });
      setupActorSubscriptions(actorMock as any, selfClient, deps);

      emitState('error');

      expect(handleRegisterErrorOrFailure).not.toHaveBeenCalled();
    });
  });

  describe('account_recovery_choice transition', () => {
    it('calls _handleAccountRecoveryChoice when state reaches account_recovery_choice', () => {
      snapshot = makeSnapshot({ circuitType: 'register' });
      setupActorSubscriptions(actorMock as any, selfClient, deps);

      emitState('account_recovery_choice');

      expect(snapshot._handleAccountRecoveryChoice).toHaveBeenCalledWith(selfClient);
    });
  });
});
