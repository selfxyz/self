// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';
import type { transportFunctionType } from 'react-native-logs';

import { registerDocumentChangeCallback } from '@/providers/passportDataProvider';

import {
  GRAFANA_LOKI_PASSWORD,
  GRAFANA_LOKI_URL,
  GRAFANA_LOKI_USERNAME,
} from '../../../../env';

interface LokiLogEntry {
  timestamp: string;
  line: string;
  level: string;
}

interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][];
}

interface LokiPayload {
  streams: LokiStream[];
}

// Batch management state
let batch: LokiLogEntry[] = [];
let batchTimer: NodeJS.Timeout | null = null;
const BATCH_SIZE = 100;
const BATCH_TIMEOUT = 5000; // 5 seconds

const sendBatch = async (
  batchToSend: LokiLogEntry[],
  namespace: string = 'default',
) => {
  if (!GRAFANA_LOKI_URL || batchToSend.length === 0) {
    return;
  }

  try {
    const streamsMap = new Map<string, [string, string][]>();

    // First pass: group logs by level
    batchToSend.forEach(entry => {
      const level = entry.level || 'unknown';
      if (!streamsMap.has(level)) {
        streamsMap.set(level, []);
      }
      streamsMap.get(level)!.push([entry.timestamp, entry.line]);
    });

    // Second pass: create streams from grouped data
    const streams: LokiStream[] = Array.from(streamsMap.entries()).map(
      ([level, values]) => ({
        stream: {
          namespace,
          app: 'self-mobile',
          platform: 'react-native',
          level,
        },
        values,
      }),
    );

    const payload: LokiPayload = { streams };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (GRAFANA_LOKI_USERNAME && GRAFANA_LOKI_PASSWORD) {
      const auth = Buffer.from(
        `${GRAFANA_LOKI_USERNAME}:${GRAFANA_LOKI_PASSWORD}`,
      ).toString('base64');
      headers.Authorization = `Basic ${auth}`;
    }

    const response = await fetch(`${GRAFANA_LOKI_URL}/loki/api/v1/push`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(
        `Loki transport failed: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.warn('Loki transport error:', error);
  }
};

const scheduleBatch = (namespace: string) => {
  if (batchTimer) {
    clearTimeout(batchTimer);
  }

  batchTimer = setTimeout(() => {
    if (batch.length > 0) {
      sendBatch([...batch], namespace);
      batch = [];
    }
  }, BATCH_TIMEOUT);
};

const addToBatch = (entry: LokiLogEntry, namespace: string) => {
  batch.push(entry);

  // Send immediately if batch is full
  if (batch.length >= BATCH_SIZE) {
    sendBatch([...batch], namespace);
    batch = [];
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
  } else {
    // Schedule batch send
    scheduleBatch(namespace);
  }
};

// Global flag to track if current passport is mock
let isCurrentPassportMockFlag = false;

// Register callback to be notified when document changes
registerDocumentChangeCallback((isMock: boolean) => {
  isCurrentPassportMockFlag = isMock;
});

const cleanupLokiTransport = () => {
  try {
    appStateSubscription.remove?.();
  } catch {}
  flushLokiTransport();
};

// Export flush function for manual flushing if needed
const flushLokiTransport = () => {
  if (batch.length > 0) {
    sendBatch([...batch], 'default');
    batch = [];
  }
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
};

const handleAppStateChange = (nextAppState: AppStateStatus) => {
  if (nextAppState === 'background' || nextAppState === 'inactive') {
    flushLokiTransport();
  }
};

const appStateSubscription = AppState.addEventListener(
  'change',
  handleAppStateChange,
);

type LokiTransportOptions = Record<string, never>;

// Create react-native-logs transport function
const lokiTransport: transportFunctionType<LokiTransportOptions> = props => {
  const { msg, rawMsg, level, extension } = props;

  if (isCurrentPassportMockFlag) {
    return; // Skip Loki transport for mock passports
  }

  // Extract namespace from extension
  const namespace = extension || 'default';

  const timestamp = new Date().toISOString();

  // Extract the actual message and data from the formatted log
  let actualMessage = msg;
  let actualData = rawMsg;

  // If rawMsg is an array, the first element is usually the message and the rest is data
  if (Array.isArray(rawMsg) && rawMsg.length > 0) {
    actualMessage = rawMsg[0];
    actualData = rawMsg.length > 1 ? rawMsg[1] : undefined;
  }

  // Create the log object
  const logObject: {
    level: string;
    message: string;
    timestamp: string;
    data?: unknown;
  } = {
    level: level.text,
    message: actualMessage,
    timestamp,
  };

  if (actualData) {
    logObject.data = actualData;
  }

  const logLine = JSON.stringify(logObject);

  const entry: LokiLogEntry = {
    timestamp: (Date.now() * 1000000).toString(), // Loki expects nanoseconds
    line: logLine,
    level: level.text,
  };

  addToBatch(entry, namespace);
};

export {
  type LokiTransportOptions,
  cleanupLokiTransport,
  flushLokiTransport,
  lokiTransport,
};
