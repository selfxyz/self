// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { KmpBridgeTransport } from '@selfxyz/rn-sdk';

interface PendingRequest {
  resolve: (payload: unknown) => void;
  reject: (error: { code: string; message: string }) => void;
  startedAt: number;
}

interface LogEntry {
  ts: string;
  text: string;
}

const RESPONSE_PREFIX = "window.SelfNativeBridge._handleResponse('";
const RESPONSE_SUFFIX = "')";

function unescapeJsString(escaped: string): string {
  return escaped
    .replace(/\\u2029/g, ' ')
    .replace(/\\u2028/g, ' ')
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

function extractResponseJson(jsInjection: string): string | null {
  const trimmed = jsInjection.trim().replace(/;$/, '');
  if (!trimmed.startsWith(RESPONSE_PREFIX) || !trimmed.endsWith(RESPONSE_SUFFIX)) {
    return null;
  }
  const escaped = trimmed.slice(RESPONSE_PREFIX.length, -RESPONSE_SUFFIX.length);
  return unescapeJsString(escaped);
}

interface KmpBridgeSmokeScreenProps {
  onBack: () => void;
}

export function KmpBridgeSmokeScreen({ onBack }: KmpBridgeSmokeScreenProps): React.JSX.Element {
  const [key, setKey] = useState('self.test');
  const [value, setValue] = useState('hello');
  const [log, setLog] = useState<LogEntry[]>([]);

  const pending = useRef(new Map<string, PendingRequest>());

  const transport = useMemo(
    () =>
      new KmpBridgeTransport({
        debug: __DEV__,
        inject: (js: string) => {
          const responseJson = extractResponseJson(js);
          if (!responseJson) {
            appendLog(`inject: unparseable JS payload (${js.slice(0, 80)}…)`);
            return;
          }
          let parsed: {
            requestId?: string;
            success?: boolean;
            data?: unknown;
            error?: { code: string; message: string };
          };
          try {
            parsed = JSON.parse(responseJson);
          } catch (err) {
            appendLog(`inject: invalid JSON (${(err as Error).message})`);
            return;
          }
          if (!parsed.requestId) {
            appendLog(`inject: response missing requestId`);
            return;
          }
          const handler = pending.current.get(parsed.requestId);
          if (!handler) {
            appendLog(`inject: no pending request for ${parsed.requestId}`);
            return;
          }
          pending.current.delete(parsed.requestId);
          const elapsed = Date.now() - handler.startedAt;
          appendLog(`response ${parsed.requestId.slice(0, 8)} success=${parsed.success} ${elapsed}ms`);
          if (parsed.success) handler.resolve(parsed.data);
          else handler.reject(parsed.error ?? { code: 'UNKNOWN', message: 'no error payload' });
        },
      }),
    [],
  );

  useEffect(() => {
    return () => transport.dispose();
  }, [transport]);

  function appendLog(text: string) {
    setLog(prev => {
      const next = [...prev, { ts: new Date().toISOString().slice(11, 23), text }];
      return next.slice(-30);
    });
  }

  function dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!transport.isAvailable()) {
      appendLog('ERROR: SelfBridge native module not linked');
      return Promise.reject(new Error('SelfBridge not linked'));
    }
    const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = JSON.stringify({
      type: 'request',
      version: 1,
      id,
      domain: 'secureStorage',
      method,
      params,
      timestamp: Date.now(),
    });
    return new Promise((resolve, reject) => {
      pending.current.set(id, { resolve, reject, startedAt: Date.now() });
      appendLog(`dispatch ${method} ${id.slice(0, 8)}`);
      try {
        transport.dispatch(payload);
      } catch (err) {
        pending.current.delete(id);
        reject(err);
      }
    });
  }

  function run(action: () => Promise<unknown>) {
    action().catch(err => {
      const code = (err as { code?: string }).code ?? 'ERROR';
      const message = (err as { message?: string }).message ?? String(err);
      appendLog(`reject ${code}: ${message}`);
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>KMP Bridge · secureStorage smoke</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Exercises the new SelfBridge native module that wraps kmp-sdk's MessageRouter +
          SecureStorageBridgeHandler + EncryptedSharedPreferencesProvider. No WebView; this
          screen acts as a stub WebView caller.
        </Text>

        <Text style={styles.label}>Key</Text>
        <TextInput
          style={styles.input}
          value={key}
          onChangeText={setKey}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Value</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => run(() => dispatch('set', { key, value }))}
          >
            <Text style={styles.actionButtonText}>set</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => run(() => dispatch('get', { key }))}
          >
            <Text style={styles.actionButtonText}>get</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => run(() => dispatch('remove', { key }))}
          >
            <Text style={styles.actionButtonText}>remove</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logCard}>
          <Text style={styles.logHeader}>Log</Text>
          {log.length === 0 ? (
            <Text style={styles.logEmpty}>No events yet.</Text>
          ) : (
            log.map((entry, idx) => (
              <Text key={`${entry.ts}-${idx}`} style={styles.logLine}>
                {entry.ts} {entry.text}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f8' },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: { fontSize: 14, color: '#0969da' },
  title: { fontSize: 18, fontWeight: '600', color: '#111827' },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  description: { fontSize: 13, color: '#374151', lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: -8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  row: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    backgroundColor: '#0969da',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  logCard: {
    backgroundColor: '#0d1117',
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    gap: 4,
  },
  logHeader: { color: '#7d8590', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  logEmpty: { color: '#7d8590', fontSize: 12, fontStyle: 'italic' },
  logLine: { color: '#e6edf3', fontSize: 11, fontFamily: 'monospace' },
});
