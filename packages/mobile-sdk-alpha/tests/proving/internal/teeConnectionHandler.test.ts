// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { getCircuitNameFromPassportData } from '@selfxyz/common/utils';

import type { ProvingDependencies, ProvingStateWithMethods } from '../../../src/proving/internal/dependencyFactory';
import { initTeeConnection } from '../../../src/proving/internal/teeConnectionHandler';
import { resolveWebSocketUrl } from '../../../src/proving/internal/websocketUrlResolver';
import type { SelfClient } from '../../../src/types/public';
import { actorMock, emitState } from '../actorMock';

vi.mock('@selfxyz/common/utils', async () => {
  const actual = await vi.importActual<typeof import('@selfxyz/common/utils')>('@selfxyz/common/utils');
  return {
    ...actual,
    getCircuitNameFromPassportData: vi.fn(() => 'register_circuit'),
  };
});

vi.mock('../../../src/proving/internal/websocketUrlResolver', () => ({
  resolveWebSocketUrl: vi.fn(() => 'wss://tee.example/proving'),
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
  passportData: {
    documentCategory: 'passport',
    mock: false,
  } as any,
  secret: 'secret',
  circuitType: 'register',
  error_code: null,
  reason: null,
  endpointType: 'https' as any,
  env: 'prod',
  parseIDDocument: vi.fn(),
  startFetchingData: vi.fn(),
  validatingDocument: vi.fn(),
  initTeeConnection: vi.fn(),
  startProving: vi.fn(),
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

describe('internal teeConnectionHandler', () => {
  let snapshot: ProvingStateWithMethods;
  let deps: ProvingDependencies;
  let selfClient: SelfClient;
  let mockWebSocket: {
    addEventListener: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (actorMock as any)._callback = null;
    snapshot = makeSnapshot();

    deps = {
      get: vi.fn(() => snapshot),
      set: vi.fn((partial: Partial<ProvingStateWithMethods>) => {
        snapshot = { ...snapshot, ...partial };
      }),
      getActor: vi.fn(() => actorMock as any),
    };

    mockWebSocket = {
      addEventListener: vi.fn(),
      close: vi.fn(),
      removeEventListener: vi.fn(),
      send: vi.fn(),
    };
    global.WebSocket = vi.fn(() => mockWebSocket) as any;

    selfClient = {
      trackEvent: vi.fn(),
      logProofEvent: vi.fn(),
      getSelfAppState: vi.fn(() => ({
        selfApp: {
          userId: 'user-123',
        },
      })),
      getProvingState: vi.fn(() => ({
        uuid: 'session-uuid',
        circuitType: 'register',
        currentState: 'idle',
      })),
      getProtocolState: vi.fn(() => ({})),
      config: {
        platform: 'ios',
        debug: false,
      },
    } as unknown as SelfClient;
  });

  it('throws when passportData is missing', async () => {
    snapshot = makeSnapshot({ passportData: null });

    await expect(initTeeConnection(selfClient, deps)).rejects.toThrow('PassportData is not available');
  });

  it('sends CONNECT_ERROR when circuit name cannot be determined', async () => {
    vi.mocked(getCircuitNameFromPassportData).mockReturnValueOnce(null as any);

    await expect(initTeeConnection(selfClient, deps)).rejects.toThrow('Could not determine circuit name');
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'CONNECT_ERROR' });
  });

  it('sends CONNECT_ERROR when WebSocket URL is unavailable', async () => {
    vi.mocked(resolveWebSocketUrl).mockReturnValueOnce(undefined);

    await expect(initTeeConnection(selfClient, deps)).rejects.toThrow('No WebSocket URL available for TEE connection');
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'CONNECT_ERROR' });
  });

  it('creates websocket, registers handlers, and resolves true on ready_to_prove', async () => {
    const promise = initTeeConnection(selfClient, deps);

    expect((snapshot as any)._closeConnections).toHaveBeenCalledWith(selfClient);
    expect(global.WebSocket).toHaveBeenCalledWith('wss://tee.example/proving');
    expect(mockWebSocket.addEventListener).toHaveBeenCalledTimes(4);
    expect(deps.set).toHaveBeenCalledWith(
      expect.objectContaining({
        wsConnection: mockWebSocket,
        wsHandlers: expect.objectContaining({
          message: expect.any(Function),
          open: expect.any(Function),
          error: expect.any(Function),
          close: expect.any(Function),
        }),
        wsReconnectAttempts: 0,
      }),
    );

    emitState('ready_to_prove');
    await expect(promise).resolves.toBe(true);
  });

  it('resolves false when actor reaches error state', async () => {
    const promise = initTeeConnection(selfClient, deps);

    emitState('error');
    await expect(promise).resolves.toBe(false);
  });
});
