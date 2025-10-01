// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { DocumentCatalog, IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';
import { extractNameFromMRZ, getAllDocuments, SdkEvents, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { Picker } from '@react-native-picker/picker';
import SafeAreaScrollView from '../components/SafeAreaScrollView';
import StandardHeader from '../components/StandardHeader';

type Props = {
  catalog: DocumentCatalog;
  onBack: () => void;
  onSuccess?: () => void; // Callback to refresh parent catalog
};

const humanizeDocumentType = (documentType: string) => {
  if (documentType.startsWith('mock_')) {
    const base = documentType.replace('mock_', '');
    return `Mock ${base.replace('_', ' ')}`.replace(/\b\w/g, char => char.toUpperCase());
  }
  return documentType.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export default function RegisterDocument({ catalog, onBack, onSuccess }: Props) {
  const selfClient = useSelfClient();
  const { useProvingStore } = selfClient;
  const currentState = useProvingStore(state => state.currentState);
  const circuitType = useProvingStore(state => state.circuitType);
  const init = useProvingStore(state => state.init);
  const setUserConfirmed = useProvingStore(state => state.setUserConfirmed);

  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(catalog.selectedDocumentId || '');
  const [selectedDocument, setSelectedDocument] = useState<IDDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [detailedLogs, setDetailedLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Add log entry
  const addLog = useCallback((message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    setDetailedLogs(prev => [`${emoji} [${timestamp}] ${message}`, ...prev].slice(0, 50)); // Keep last 50 logs
  }, []);

  // Refresh catalog helper
  const refreshCatalog = useCallback(async () => {
    try {
      const updatedCatalog = await selfClient.loadDocumentCatalog();
      addLog('Catalog refreshed successfully');
      if (onSuccess) {
        onSuccess();
      }
      return updatedCatalog;
    } catch (error) {
      console.error('Error refreshing catalog:', error);
      addLog(`Failed to refresh catalog: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }, [selfClient, onSuccess, addLog]);

  // Update selected document when catalog changes (e.g., after generating a new mock)
  useEffect(() => {
    if (catalog.selectedDocumentId && catalog.selectedDocumentId !== selectedDocumentId) {
      setSelectedDocumentId(catalog.selectedDocumentId);
    }
  }, [catalog.selectedDocumentId, selectedDocumentId]);

  useEffect(() => {
    const loadSelectedDocument = async () => {
      if (!selectedDocumentId) {
        setSelectedDocument(null);
        return;
      }

      setLoading(true);
      try {
        const allDocuments = await getAllDocuments(selfClient);
        const doc = allDocuments[selectedDocumentId];
        setSelectedDocument(doc?.data ?? null);
      } catch {
        setSelectedDocument(null);
      } finally {
        setLoading(false);
      }
    };

    loadSelectedDocument();
  }, [selectedDocumentId, selfClient]);

  // Listen to SDK proof events for detailed feedback
  useEffect(() => {
    if (!registering) return;

    const unsubscribe = selfClient.on(SdkEvents.PROOF_EVENT, payload => {
      if (!payload) return;
      const { event, level, details } = payload;
      console.log('Proof event:', event, level, details);
      addLog(event, level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info');
    });

    return () => {
      unsubscribe();
    };
  }, [selfClient, registering, addLog]);

  // Monitor proving state changes
  useEffect(() => {
    if (!registering) return;

    console.log('Registration state:', currentState, 'circuit:', circuitType);

    switch (currentState) {
      case 'fetching_data':
        setStatusMessage('📡 Fetching protocol data from network...');
        addLog('Fetching DSC/CSCA trees and circuits');
        break;
      case 'validating_document':
        setStatusMessage('🔍 Validating document authenticity...');
        addLog('Validating document signatures and checking registration status');
        break;
      case 'init_tee_connexion':
        setStatusMessage('🔐 Establishing secure TEE connection...');
        addLog('Connecting to Trusted Execution Environment');
        break;
      case 'ready_to_prove':
        setStatusMessage('⚡ Ready to generate proof...');
        addLog('TEE connection established, auto-confirming proof generation');
        // Auto-confirm for demo purposes
        setTimeout(() => {
          setUserConfirmed(selfClient);
          addLog('User confirmation sent, starting proof generation');
        }, 500);
        break;
      case 'proving':
        setStatusMessage('🔄 Generating zero-knowledge proof...');
        addLog('TEE is generating the attestation proof');
        break;
      case 'post_proving':
        if (circuitType === 'dsc') {
          setStatusMessage('📝 DSC verified, proceeding to registration...');
          addLog('DSC proof completed, chaining to registration proof');
        } else {
          setStatusMessage('✨ Finalizing registration...');
          addLog('Registration proof completed, updating state');
        }
        break;
      case 'completed':
        setStatusMessage('🎉 Registration completed successfully!');
        addLog('Document registered on-chain!', 'info');
        setRegistering(false);

        // Refresh catalog and show success
        setTimeout(async () => {
          await refreshCatalog();
          Alert.alert(
            'Success! 🎉',
            `Your ${selectedDocument?.mock ? 'mock ' : ''}document has been registered on-chain!`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setStatusMessage('');
                  setDetailedLogs([]);
                  // Reset selected document
                  setSelectedDocumentId('');
                },
              },
            ],
          );
        }, 1000);
        break;
      case 'error':
      case 'failure':
        setStatusMessage('❌ Registration failed');
        addLog('Registration failed - check logs for details', 'error');
        setRegistering(false);
        Alert.alert('Registration Failed', 'The registration process failed. Please check the logs for details.', [
          {
            text: 'View Logs',
            onPress: () => setShowLogs(true),
          },
          {
            text: 'Close',
            onPress: () => {
              setStatusMessage('');
              setShowLogs(false);
            },
          },
        ]);
        break;
    }
  }, [currentState, circuitType, registering, selfClient, setUserConfirmed, selectedDocument, refreshCatalog, addLog]);

  const handleRegister = async () => {
    if (!selectedDocument || !selectedDocumentId) return;

    try {
      setRegistering(true);
      setDetailedLogs([]);
      setStatusMessage('🚀 Initializing registration...');
      addLog(`Starting registration for document ${selectedDocumentId.slice(0, 8)}...`);

      // Set the selected document in the catalog
      const updatedCatalog = { ...catalog, selectedDocumentId };
      await selfClient.saveDocumentCatalog(updatedCatalog);
      addLog('Document selected in catalog');

      // Determine circuit type based on document
      // For mock documents, use 'register' directly
      // For real documents (aadhaar), use 'register'
      // For real passports/IDs, use 'dsc' which will chain to 'register'
      const chosenCircuitType =
        selectedDocument.mock || selectedDocument.documentCategory === 'aadhaar' ? 'register' : 'dsc';

      addLog(`Using circuit type: ${chosenCircuitType}`);
      console.log('Starting registration with circuit type:', chosenCircuitType);

      // Initialize the proving state machine
      init(selfClient, chosenCircuitType);
      addLog('Proving state machine initialized');
    } catch (err) {
      console.error('Registration error:', err);
      setRegistering(false);
      setStatusMessage('');
      addLog(`Registration initialization failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
      Alert.alert('Error', `Registration failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Filter to only unregistered documents and sort newest first
  const availableDocuments = (catalog.documents || []).filter(doc => !doc.isRegistered).reverse();

  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title="Register Document [WiP]" onBack={onBack} />

      <View style={styles.content}>
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Select Document</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedDocumentId}
              onValueChange={(itemValue: string) => setSelectedDocumentId(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              enabled={!registering}
            >
              <Picker.Item label="Select a document..." value="" style={styles.pickerItem} />
              {availableDocuments.map(doc => {
                const nameData = extractNameFromMRZ(doc.data || '');
                const docType = humanizeDocumentType(doc.documentType);
                const docId = doc.id.slice(0, 8);

                let label = `${docType} - ${docId}...`;
                if (nameData) {
                  const fullName = `${nameData.firstName} ${nameData.lastName}`.trim();
                  label = fullName ? `${fullName} - ${docType} - ${docId}...` : label;
                }

                return <Picker.Item key={doc.id} label={label} value={doc.id} style={styles.pickerItem} />;
              })}
            </Picker>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}

        {registering && statusMessage && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#007AFF" style={styles.statusSpinner} />
            <Text style={styles.statusText}>{statusMessage}</Text>
            <Text style={styles.statusState}>State: {currentState}</Text>

            {detailedLogs.length > 0 && (
              <TouchableOpacity onPress={() => setShowLogs(!showLogs)} style={styles.logsToggle}>
                <Text style={styles.logsToggleText}>
                  {showLogs ? '▼ Hide Logs' : '▶ Show Logs'} ({detailedLogs.length})
                </Text>
              </TouchableOpacity>
            )}

            {showLogs && detailedLogs.length > 0 && (
              <ScrollView style={styles.logsContainer} nestedScrollEnabled>
                {detailedLogs.map((log, index) => (
                  <Text key={index} style={styles.logEntry}>
                    {log}
                  </Text>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {selectedDocument && !loading && (
          <>
            <View style={styles.documentSection}>
              <Text style={styles.documentTitle}>Document Data:</Text>
              <ScrollView style={styles.documentDataContainer} nestedScrollEnabled>
                <Text style={styles.documentData} selectable>
                  {JSON.stringify(selectedDocument, null, 2)}
                </Text>
              </ScrollView>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title={registering ? 'Registering...' : 'Register Document'}
                onPress={handleRegister}
                disabled={registering}
              />
            </View>
          </>
        )}

        {!selectedDocument && !loading && selectedDocumentId && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Document not found</Text>
          </View>
        )}

        {!selectedDocumentId && availableDocuments.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No unregistered documents available. Generate a mock document to get started.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#fafbfc',
  },
  content: {
    flex: 1,
  },
  pickerContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  pickerItem: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  statusContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  statusSpinner: {
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '600',
  },
  statusState: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  logsToggle: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  logsToggleText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '600',
  },
  logsContainer: {
    marginTop: 8,
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffc107',
    padding: 8,
  },
  logEntry: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 4,
  },
  documentSection: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  documentDataContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  documentData: {
    fontSize: 12,
    fontFamily: 'monospace',
    padding: 12,
  },
  buttonContainer: {
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
