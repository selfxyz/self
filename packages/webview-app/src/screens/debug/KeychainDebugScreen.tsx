// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { bridgeStorageAdapter } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';

interface LogEntry {
  time: string;
  message: string;
  error?: boolean;
}

function timestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export const KeychainDebugScreen: React.FC = () => {
  const navigate = useNavigate();
  const bridge = useBridge();
  const { documents } = useSelfClient();
  const storage = useRef(bridgeStorageAdapter(bridge)).current;

  const [key, setKey] = useState('test-key');
  const [value, setValue] = useState('hello-world');
  const [docId, setDocId] = useState('mock-doc-1');
  const [log, setLog] = useState<LogEntry[]>([]);

  const addLog = useCallback((message: string, error = false) => {
    setLog(prev => [...prev, { time: timestamp(), message, error }]);
  }, []);

  const handlePing = useCallback(async () => {
    addLog(`Bridge: connected=${bridge.isConnected}, pending=${bridge.pendingCount}`);
    try {
      const result = await bridge.request('secureStorage', 'get', { key: '__ping__' }, 5000);
      addLog(`PING OK -> ${JSON.stringify(result)}`);
    } catch (e) {
      addLog(`PING FAILED: ${e}`, true);
    }
  }, [bridge, addLog]);

  const handleSet = useCallback(async () => {
    try {
      await storage.set(key, value);
      addLog(`SET "${key}" = "${value}" -> OK`);
    } catch (e) {
      addLog(`SET "${key}" FAILED: ${e}`, true);
    }
  }, [storage, key, value, addLog]);

  const handleGet = useCallback(async () => {
    try {
      const result = await storage.get(key);
      addLog(`GET "${key}" -> ${result === null ? 'null' : `"${result}"`}`);
    } catch (e) {
      addLog(`GET "${key}" FAILED: ${e}`, true);
    }
  }, [storage, key, addLog]);

  const handleRemove = useCallback(async () => {
    try {
      await storage.remove(key);
      addLog(`REMOVE "${key}" -> OK`);
    } catch (e) {
      addLog(`REMOVE "${key}" FAILED: ${e}`, true);
    }
  }, [storage, key, addLog]);

  const handleSaveDoc = useCallback(async () => {
    try {
      const mockDoc = {
        documentType: 'passport',
        issuingCountry: 'US',
        nationality: 'USA',
        dateOfBirth: '1990-01-15',
        dateOfExpiry: '2030-06-20',
        documentNumber: 'X12345678',
        firstName: 'Debug',
        lastName: 'User',
      };
      await documents.saveDocument(docId, mockDoc as never);

      const catalog = await documents.loadDocumentCatalog();
      const entry = {
        id: docId,
        documentType: 'passport',
        documentCategory: 'passport' as const,
        data: '',
        mock: true,
      };
      const existing = catalog.documents.findIndex((d: { id: string }) => d.id === docId);
      if (existing >= 0) {
        catalog.documents[existing] = entry;
      } else {
        catalog.documents.push(entry);
      }
      await documents.saveDocumentCatalog(catalog);

      addLog(`SAVE DOC "${docId}" + catalog -> OK`);
    } catch (e) {
      addLog(`SAVE DOC "${docId}" FAILED: ${e}`, true);
    }
  }, [documents, docId, addLog]);

  const handleLoadDoc = useCallback(async () => {
    try {
      const doc = await documents.loadDocumentById(docId);
      addLog(`LOAD DOC "${docId}" -> ${doc === null ? 'null' : JSON.stringify(doc).slice(0, 120)}`);
    } catch (e) {
      addLog(`LOAD DOC "${docId}" FAILED: ${e}`, true);
    }
  }, [documents, docId, addLog]);

  const handleLoadCatalog = useCallback(async () => {
    try {
      const catalog = await documents.loadDocumentCatalog();
      addLog(`CATALOG -> ${JSON.stringify(catalog)}`);
    } catch (e) {
      addLog(`CATALOG FAILED: ${e}`, true);
    }
  }, [documents, addLog]);

  const handleDeleteDoc = useCallback(async () => {
    try {
      await documents.deleteDocument(docId);

      const catalog = await documents.loadDocumentCatalog();
      catalog.documents = catalog.documents.filter((d: { id: string }) => d.id !== docId);
      await documents.saveDocumentCatalog(catalog);

      addLog(`DELETE DOC "${docId}" + catalog update -> OK`);
    } catch (e) {
      addLog(`DELETE DOC "${docId}" FAILED: ${e}`, true);
    }
  }, [documents, docId, addLog]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/settings/dev-mode')}>
          &larr; Back
        </button>
        <h2 style={styles.title}>Keychain Debug</h2>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: bridge.isConnected ? '#a0e0a0' : '#e94560' }}>
          {bridge.isConnected ? 'Bridge connected' : 'No transport'}
        </span>
      </div>

      <div style={styles.section}>
        <div style={styles.row}>
          <button style={{ ...styles.button, backgroundColor: '#e0a030' }} onClick={handlePing}>
            Ping Bridge (5s timeout)
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Raw Secure Storage</h3>
        <div style={styles.row}>
          <input style={styles.input} placeholder="Key" value={key} onChange={e => setKey(e.target.value)} />
          <input style={styles.input} placeholder="Value" value={value} onChange={e => setValue(e.target.value)} />
        </div>
        <div style={styles.row}>
          <button style={styles.button} onClick={handleSet}>
            Set
          </button>
          <button style={styles.button} onClick={handleGet}>
            Get
          </button>
          <button style={{ ...styles.button, ...styles.dangerButton }} onClick={handleRemove}>
            Remove
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Documents Adapter</h3>
        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="Document ID"
            value={docId}
            onChange={e => setDocId(e.target.value)}
          />
        </div>
        <div style={styles.row}>
          <button style={styles.button} onClick={handleSaveDoc}>
            Save Mock
          </button>
          <button style={styles.button} onClick={handleLoadDoc}>
            Load
          </button>
          <button style={{ ...styles.button, ...styles.dangerButton }} onClick={handleDeleteDoc}>
            Delete
          </button>
        </div>
        <div style={styles.row}>
          <button style={styles.button} onClick={handleLoadCatalog}>
            Load Catalog
          </button>
        </div>
      </div>

      <div style={styles.logSection}>
        <div style={styles.logHeader}>
          <h3 style={styles.sectionTitle}>Log</h3>
          <button style={styles.clearButton} onClick={() => setLog([])}>
            Clear
          </button>
        </div>
        <div style={styles.logArea}>
          {log.length === 0 && <span style={styles.placeholder}>No operations yet</span>}
          {log.map((entry, i) => (
            <div key={i} style={entry.error ? styles.logError : styles.logEntry}>
              <span style={styles.logTime}>{entry.time}</span> {entry.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    fontFamily: 'system-ui, sans-serif',
    maxWidth: 480,
    margin: '0 auto',
    color: '#e0e0e0',
    backgroundColor: '#1a1a2e',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#7c8aff',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
  },
  section: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#16213e',
  },
  sectionTitle: {
    margin: '0 0 10px',
    fontSize: 14,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    color: '#7c8aff',
  },
  row: {
    display: 'flex',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #333',
    backgroundColor: '#0f3460',
    color: '#e0e0e0',
    fontSize: 14,
    outline: 'none',
  },
  button: {
    padding: '8px 14px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#7c8aff',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  dangerButton: {
    backgroundColor: '#e94560',
  },
  logSection: {
    flex: 1,
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearButton: {
    background: 'none',
    border: '1px solid #555',
    color: '#aaa',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  logArea: {
    backgroundColor: '#0a0a1a',
    borderRadius: 8,
    padding: 10,
    maxHeight: 300,
    overflowY: 'auto' as const,
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 1.6,
  },
  placeholder: {
    color: '#555',
    fontStyle: 'italic',
  },
  logEntry: {
    color: '#a0e0a0',
    wordBreak: 'break-all' as const,
  },
  logError: {
    color: '#e94560',
    wordBreak: 'break-all' as const,
  },
  logTime: {
    color: '#666',
  },
};
