// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 */

import {
  flushLokiTransport,
  lokiTransport,
} from '@/services/logging/logger/lokiTransport';
import { useSettingStore } from '@/stores/settingStore';

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('@/providers/passportDataProvider', () => ({
  registerDocumentChangeCallback: jest.fn(),
}));

jest.mock('../../../../env', () => ({
  GRAFANA_LOKI_URL: 'https://loki.example.com',
  GRAFANA_LOKI_USERNAME: '',
  GRAFANA_LOKI_PASSWORD: '',
}));

jest.mock('@/stores/settingStore', () => {
  const state = {
    supportUuid: null as string | null,
    supportUuidEnabled: true,
  };
  return {
    useSettingStore: {
      getState: () => ({
        get supportUuidEnabled() {
          return state.supportUuidEnabled;
        },
        get supportUuid() {
          return state.supportUuid;
        },
      }),
      __state: state,
    },
  };
});

const storeState = (
  useSettingStore as unknown as {
    __state: { supportUuid: string | null; supportUuidEnabled: boolean };
  }
).__state;

const callTransport = (overrides: Record<string, unknown> = {}) => {
  (lokiTransport as unknown as (props: Record<string, unknown>) => void)({
    msg: 'hello',
    rawMsg: ['hello'],
    level: { text: 'info', severity: 2 },
    extension: 'default',
    ...overrides,
  });
};

describe('lokiTransport', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    storeState.supportUuid = null;
    storeState.supportUuidEnabled = true;
  });

  afterEach(() => {
    flushLokiTransport();
    jest.useRealTimers();
  });

  it('includes support_uuid in the log body when set', async () => {
    storeState.supportUuid = 'abc-123';
    callTransport();
    flushLokiTransport();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body as string);
    const logLine = JSON.parse(payload.streams[0].values[0][1]);
    expect(logLine.support_uuid).toBe('abc-123');
    expect(logLine.support_uuid_enabled).toBe(true);
  });

  it('falls back to "unset" when no support UUID is stored', async () => {
    callTransport();
    flushLokiTransport();
    await Promise.resolve();
    await Promise.resolve();

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body as string);
    const logLine = JSON.parse(payload.streams[0].values[0][1]);
    expect(logLine.support_uuid).toBe('unset');
    expect(logLine.support_uuid_enabled).toBe(true);
  });

  it('omits support_uuid when diagnostic IDs are disabled', async () => {
    storeState.supportUuidEnabled = false;
    callTransport();
    flushLokiTransport();
    await Promise.resolve();
    await Promise.resolve();

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body as string);
    const logLine = JSON.parse(payload.streams[0].values[0][1]);
    expect(logLine).not.toHaveProperty('support_uuid');
    expect(logLine.support_uuid_enabled).toBe(false);
  });

  it('does not put support_uuid or session_id in Loki stream labels', async () => {
    storeState.supportUuid = 'should-not-leak-into-labels';
    callTransport();
    flushLokiTransport();
    await Promise.resolve();
    await Promise.resolve();

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body as string);
    const stream = payload.streams[0].stream;
    expect(stream).not.toHaveProperty('support_uuid');
    expect(stream).not.toHaveProperty('session_id');
    expect(stream).toMatchObject({
      app: 'self-mobile',
      platform: 'react-native',
      level: 'info',
    });
  });
});
