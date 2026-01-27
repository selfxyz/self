// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PassportData } from '@selfxyz/common/types';

import { PROVING_EVENTS } from '../../../src/proving/internal/constants';
import type { TeeConnectionDeps } from '../../../src/proving/internal/teeConnectionHandler';
import { initTeeConnection } from '../../../src/proving/internal/teeConnectionHandler';
import type { SelfClient } from '../../../src/types/public';
import { actorMock } from '../actorMock';

vi.mock('@selfxyz/common/utils', async () => {
  const actual = await vi.importActual<typeof import('@selfxyz/common/utils')>('@selfxyz/common/utils');
  return {
    ...actual,
    getCircuitNameFromPassportData: vi.fn(() => 'test-circuit-name'),
  };
});

vi.mock('../../../src/proving/internal/websocketUrlResolver', () => ({
  resolveWebSocketUrl: vi.fn(() => 'wss://test.example.com/proving'),
}));

describe('initTeeConnection', () => {
  let mockSelfClient: SelfClient;
  let mockDeps: TeeConnectionDeps;
  let mockWebSocket: any;
  let wsEventListeners: Record<string, (event: Event) => void>;

  beforeEach(() => {
    vi.clearAllMocks();

    wsEventListeners = {};

    mockWebSocket = {
      addEventListener: vi.fn((event: string, handler: (event: Event) => void) => {
        wsEventListeners[event] = handler;
      }),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      send: vi.fn(),
    };

    global.WebSocket = vi.fn(() => mockWebSocket) as any;

    mockSelfClient = {
      logProofEvent: vi.fn(),
      trackEvent: vi.fn(),
    } as unknown as SelfClient;

    actorMock.send.mockClear();
    actorMock.subscribe.mockClear();

    mockDeps = {
      getState: vi.fn().mockReturnValue({
        passportData: {
          documentCategory: 'passport',
          mock: false,
        } as PassportData,
        circuitType: 'register',
      }),
      setState: vi.fn(),
      getActor: vi.fn().mockReturnValue(actorMock),
      handleWebSocketMessage: vi.fn(),
      handleWsOpen: vi.fn(),
      handleWsError: vi.fn(),
      handleWsClose: vi.fn(),
      closeConnections: vi.fn(),
    };
  });

  it('throws error when passportData is null', async () => {
    mockDeps.getState = vi.fn().mockReturnValue({
      passportData: null,
      circuitType: 'register',
    });

    await expect(initTeeConnection(mockSelfClient, mockDeps)).rejects.toThrow('PassportData is not available');
  });

  it('throws error when actor is null', async () => {
    mockDeps.getActor = vi.fn().mockReturnValue(null);

    await expect(initTeeConnection(mockSelfClient, mockDeps)).rejects.toThrow(
      'State machine not initialized. Call init() first.',
    );
  });

  it('sends CONNECT_ERROR when circuit name cannot be determined', async () => {
    const { getCircuitNameFromPassportData } = await import('@selfxyz/common/utils');
    vi.mocked(getCircuitNameFromPassportData).mockReturnValueOnce(null as any);

    await expect(initTeeConnection(mockSelfClient, mockDeps)).rejects.toThrow('Could not determine circuit name');
    expect(actorMock.send).toHaveBeenCalledWith({ type: PROVING_EVENTS.CONNECT_ERROR });
  });

  it('sends CONNECT_ERROR when WebSocket URL is not available', async () => {
    const { resolveWebSocketUrl } = await import('../../../src/proving/internal/websocketUrlResolver');
    vi.mocked(resolveWebSocketUrl).mockReturnValueOnce(null as any);

    await expect(initTeeConnection(mockSelfClient, mockDeps)).rejects.toThrow(
      'No WebSocket URL available for TEE connection',
    );
    expect(actorMock.send).toHaveBeenCalledWith({ type: PROVING_EVENTS.CONNECT_ERROR });
  });

  it('creates WebSocket with correct URL', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    // Simulate actor transition to ready_to_prove
    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    expect(global.WebSocket).toHaveBeenCalledWith('wss://test.example.com/proving');
  });

  it('calls closeConnections before establishing new connection', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    expect(mockDeps.closeConnections).toHaveBeenCalledWith(mockSelfClient);
  });

  it('attaches message event handler', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(wsEventListeners['message']).toBeDefined();
  });

  it('attaches open event handler', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
    expect(wsEventListeners['open']).toBeDefined();
  });

  it('attaches error event handler', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(wsEventListeners['error']).toBeDefined();
  });

  it('attaches close event handler', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    expect(wsEventListeners['close']).toBeDefined();
  });

  it('sets wsConnection and wsHandlers in state', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    expect(mockDeps.setState).toHaveBeenCalledWith({
      wsConnection: mockWebSocket,
      wsHandlers: expect.objectContaining({
        message: expect.any(Function),
        open: expect.any(Function),
        error: expect.any(Function),
        close: expect.any(Function),
      }),
    });
  });

  it('resolves true when state transitions to ready_to_prove', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    // Simulate actor transition to ready_to_prove
    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    const result = await promise;

    expect(result).toBe(true);
  });

  it('resolves false when state transitions to error', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    // Simulate actor transition to error
    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'error', matches: (v: string) => v === 'error' });

    const result = await promise;

    expect(result).toBe(false);
  });

  it('tracks TEE_CONN_STARTED event', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(expect.stringContaining('TEE_CONN'));
  });

  it('logs proof events during connection', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    expect(mockSelfClient.logProofEvent).toHaveBeenCalled();
  });

  it('handles disclose circuit type correctly', async () => {
    mockDeps.getState = vi.fn().mockReturnValue({
      passportData: {
        documentCategory: 'passport',
        mock: false,
      } as PassportData,
      circuitType: 'disclose',
    });

    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    const result = await promise;

    expect(result).toBe(true);
  });

  it('handles aadhaar document for disclose circuit type', async () => {
    mockDeps.getState = vi.fn().mockReturnValue({
      passportData: {
        documentCategory: 'aadhaar',
        mock: false,
      },
      circuitType: 'disclose',
    });

    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    const result = await promise;

    expect(result).toBe(true);
  });

  it('event handlers delegate to provided handlers', async () => {
    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    // Test message handler delegation
    const mockMessageEvent = new MessageEvent('message', { data: 'test' });
    wsEventListeners['message'](mockMessageEvent);
    expect(mockDeps.handleWebSocketMessage).toHaveBeenCalledWith(mockMessageEvent, mockSelfClient);

    // Test open handler delegation
    wsEventListeners['open']();
    expect(mockDeps.handleWsOpen).toHaveBeenCalledWith(mockSelfClient);

    // Test error handler delegation
    const mockErrorEvent = new Event('error');
    wsEventListeners['error'](mockErrorEvent);
    expect(mockDeps.handleWsError).toHaveBeenCalledWith(mockErrorEvent, mockSelfClient);

    // Test close handler delegation
    const mockCloseEvent = new CloseEvent('close', { code: 1000 });
    wsEventListeners['close'](mockCloseEvent);
    expect(mockDeps.handleWsClose).toHaveBeenCalledWith(mockCloseEvent, mockSelfClient);
  });

  it('unsubscribes from actor after successful connection', async () => {
    const unsubscribeMock = vi.fn();
    actorMock.subscribe.mockReturnValueOnce({ unsubscribe: unsubscribeMock });

    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'ready_to_prove', matches: (v: string) => v === 'ready_to_prove' });

    await promise;

    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('unsubscribes from actor after connection error', async () => {
    const unsubscribeMock = vi.fn();
    actorMock.subscribe.mockReturnValueOnce({ unsubscribe: unsubscribeMock });

    const promise = initTeeConnection(mockSelfClient, mockDeps);

    const subscribeCallback = actorMock.subscribe.mock.calls[0][0];
    subscribeCallback({ value: 'error', matches: (v: string) => v === 'error' });

    await promise;

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
