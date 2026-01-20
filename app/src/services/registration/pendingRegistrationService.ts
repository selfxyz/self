// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Socket } from 'socket.io-client';
import socketIo from 'socket.io-client';

import { getWSDbRelayerUrl } from '@selfxyz/common/utils/proving';

import { updateDocumentRegistrationState } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';

const STATUS_SUCCESS = 4;
const STATUS_FAILURE = [3, 5];
const CHECK_TIMEOUT_MS = 60000;
const RETRY_DELAYS_MS = [5000, 10000, 20000, 30000, 30000]; // 5 retries with increasing delays

/**
 * Check pending registration with retries. Completes registration if TEE finished while app was closed.
 */
export async function checkPendingRegistrationWithRetry(): Promise<{
  completed: boolean;
  documentId: string | null;
}> {
  const {
    pendingRegistrationUuid,
    pendingRegistrationDocumentId,
    pendingRegistrationIsMock,
    clearPendingRegistration,
  } = useSettingStore.getState();

  if (!pendingRegistrationUuid) {
    return { completed: false, documentId: null };
  }

  const wsUrl = getWSDbRelayerUrl(
    pendingRegistrationIsMock ? 'staging_celo' : 'celo',
  );

  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    const status = await checkStatus(wsUrl, pendingRegistrationUuid);

    if (status === STATUS_SUCCESS && pendingRegistrationDocumentId) {
      await updateDocumentRegistrationState(
        pendingRegistrationDocumentId,
        true,
      );
      clearPendingRegistration();
      console.log(
        'Completed pending registration:',
        pendingRegistrationDocumentId,
      );
      return { completed: true, documentId: pendingRegistrationDocumentId };
    }

    if (status !== null && STATUS_FAILURE.includes(status)) {
      clearPendingRegistration();
      return { completed: false, documentId: null };
    }

    // Still processing - wait before retry (skip wait on last attempt)
    if (i < RETRY_DELAYS_MS.length - 1) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[i]));
    }
  }

  return { completed: false, documentId: null };
}

/**
 * Connect to db-relayer WebSocket and get status for a registration UUID.
 */
function checkStatus(wsUrl: string, uuid: string): Promise<number | null> {
  return new Promise(resolve => {
    let socket: Socket | null = null;
    let resolved = false;

    const done = (value: number | null) => {
      if (resolved) return;
      resolved = true;
      if (socket) {
        socket.close();
        socket = null;
      }
      resolve(value);
    };

    const timeout = setTimeout(() => done(null), CHECK_TIMEOUT_MS);

    try {
      socket = socketIo(wsUrl, { path: '/', transports: ['websocket'] });

      socket.on('connect', () => socket?.emit('subscribe', uuid));

      socket.on('status', (msg: unknown) => {
        clearTimeout(timeout);
        const status =
          typeof msg === 'string'
            ? (JSON.parse(msg) as { status: number }).status
            : (msg as { status: number }).status;
        done(status);
      });

      socket.on('connect_error', () => {
        clearTimeout(timeout);
        done(null);
      });

      socket.on('disconnect', () => done(null));
    } catch {
      clearTimeout(timeout);
      done(null);
    }
  });
}
