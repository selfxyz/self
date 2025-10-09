// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DocumentCatalog, IDDocument } from '@selfxyz/common/utils/types';
import { extractNameFromDocument, getAllDocuments, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { PickerField } from '../components/PickerField';

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

  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<IDDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const registering = regState.registering;
  const statusMessage = regState.statusMessage;
  const [documentNames, setDocumentNames] = useState<Record<string, { firstName: string; lastName: string }>>({});

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

  // Auto-select first available unregistered document (newest first)
  useEffect(() => {
    const availableDocuments = (catalog.documents || []).filter(doc => !doc.isRegistered).reverse();
    const firstUnregisteredDocId = availableDocuments[0]?.id;

    if (firstUnregisteredDocId && !selectedDocumentId) {
      setSelectedDocumentId(firstUnregisteredDocId);
    }
  }, [catalog.documents, selectedDocumentId]);

  // Auto-select when catalog changes and current selection is no longer available
  useEffect(() => {
    const availableDocuments = (catalog.documents || []).filter(doc => !doc.isRegistered).reverse();
    const isCurrentSelectionAvailable = availableDocuments.some(doc => doc.id === selectedDocumentId);

    if (!isCurrentSelectionAvailable && availableDocuments.length > 0) {
      setSelectedDocumentId(availableDocuments[0].id);
    }
  }, [catalog.documents, selectedDocumentId]);

  // Load names for all documents in the catalog
  useEffect(() => {
    let cancelled = false;

    const loadDocumentNames = async () => {
      const names: Record<string, { firstName: string; lastName: string }> = {};
      await Promise.all(
        (catalog.documents || []).map(async doc => {
          if (doc.isRegistered) return;
          const name = await extractNameFromDocument(selfClient, doc.id);
          if (name) {
            names[doc.id] = name;
          }
        }),
      );
      if (!cancelled) {
        setDocumentNames(names);
      }
    };

    loadDocumentNames();

    return () => {
      cancelled = true;
    };
  }, [catalog.documents, selfClient]);

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

  // One-shot completion handler to avoid repeated alerts
  useEffect(() => {
    actions.setOnComplete(async () => {
      if (!mounted.current) return;
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
                actions.reset();
              }
            },
          },
        ],
      );
    });
    return () => actions.setOnComplete(null);
  }, [actions, selectedDocument, refreshCatalog]);

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
  const firstAvailableDocId = availableDocuments[0]?.id || '';
  const selectedIdForPicker = selectedDocumentId || firstAvailableDocId || '';

  return (
    <ScreenLayout title="Register Document" onBack={onBack}>
      <View style={styles.content}>
        {availableDocuments.length > 0 && (
          <PickerField
            label="Select Document"
            selectedValue={selectedIdForPicker}
            onValueChange={setSelectedDocumentId}
            enabled={!registering}
            items={
              !firstAvailableDocId
                ? [{ label: 'Select a document...', value: '' }]
                : availableDocuments.map(doc => {
                    const nameData = documentNames[doc.id];
                    const docType = humanizeDocumentType(doc.documentType);
                    const docId = doc.id.slice(0, 8);

                    let label = `${docType} - ${docId}...`;
                    if (nameData) {
                      const fullName = `${nameData.firstName} ${nameData.lastName}`.trim();
                      label = fullName ? `${fullName} - ${docType} - ${docId}...` : label;
                    }

                    return { label, value: doc.id };
                  })
            }
          />
        )}

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

            <LogsPanel logs={regState.logs} show={regState.showLogs} onToggle={actions.toggleLogs} />
          </View>
        )}

        {selectedDocument && !loading && availableDocuments.length > 0 && (
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

        {availableDocuments.length === 0 && (
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
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
