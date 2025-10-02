// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DocumentCatalog, IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';
import { extractNameFromMRZ, getAllDocuments, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { Picker } from '@react-native-picker/picker';
import ScreenLayout from '../components/ScreenLayout';
import LogsPanel from '../components/LogsPanel';
import { useRegistration } from '../hooks/useRegistration';
import { humanizeDocumentType } from '../utils/document';

type Props = {
  catalog: DocumentCatalog;
  onBack: () => void;
  onSuccess?: () => void; // Callback to refresh parent catalog
};

// display helpers moved to utils/document

export default function RegisterDocument({ catalog, onBack, onSuccess }: Props) {
  const selfClient = useSelfClient();
  const { useProvingStore } = selfClient;
  const currentState = useProvingStore(state => state.currentState);
  // circuitType managed inside useRegistration
  const { state: regState, actions } = useRegistration();

  const mounted = useRef(true);
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(catalog.selectedDocumentId || '');
  const [selectedDocument, setSelectedDocument] = useState<IDDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const registering = regState.registering;
  const statusMessage = regState.statusMessage;
  const detailedLogs = regState.logs;
  const showLogs = regState.showLogs;

  // Refresh catalog helper
  const refreshCatalog = useCallback(async () => {
    try {
      const updatedCatalog = await selfClient.loadDocumentCatalog();
      // log via registration panel
      if (onSuccess) {
        onSuccess();
      }
      return updatedCatalog;
    } catch (error) {
      console.error('Error refreshing catalog:', error);
    }
  }, [selfClient, onSuccess]);

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

  // Monitor completion and errors for dialogs
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (!registering && regState.statusMessage.startsWith('🎉')) {
      timeoutId = setTimeout(async () => {
        // Guard against updates after unmount or during a new registration attempt
        if (mounted.current && !registering && regState.statusMessage.startsWith('🎉')) {
          await refreshCatalog();
          Alert.alert(
            'Success! 🎉',
            `Your ${selectedDocument?.mock ? 'mock ' : ''}document has been registered on-chain!`,
            [
              {
                text: 'OK',
                onPress: () => {
                  if (mounted.current) {
                    setSelectedDocumentId('');
                  }
                },
              },
            ],
          );
        }
      }, 1000);
    }

    // Cleanup the timeout if the component unmounts or dependencies change
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [registering, regState.statusMessage, selectedDocument, refreshCatalog]);

  const handleRegister = async () => {
    if (!selectedDocument || !selectedDocumentId) return;

    try {
      // Set the selected document in the catalog
      const updatedCatalog = { ...catalog, selectedDocumentId };
      await selfClient.saveDocumentCatalog(updatedCatalog);
      actions.start(selectedDocumentId, selectedDocument);
    } catch (err) {
      console.error('Registration error:', err);
      Alert.alert('Error', `Registration failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Filter to only unregistered documents and sort newest first
  const availableDocuments = (catalog.documents || []).filter(doc => !doc.isRegistered).reverse();

  return (
    <ScreenLayout title="Register Document [WiP]" onBack={onBack}>
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

            <LogsPanel logs={detailedLogs} show={showLogs} onToggle={actions.toggleLogs} />
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
    </ScreenLayout>
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
