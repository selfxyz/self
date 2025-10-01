// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DocumentCatalog, IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';
import { extractNameFromMRZ, getAllDocuments, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { Picker } from '@react-native-picker/picker';
import SafeAreaScrollView from '../components/SafeAreaScrollView';
import StandardHeader from '../components/StandardHeader';

type Props = {
  catalog: DocumentCatalog;
  onBack: () => void;
};

const humanizeDocumentType = (documentType: string) => {
  if (documentType.startsWith('mock_')) {
    const base = documentType.replace('mock_', '');
    return `Mock ${base.replace('_', ' ')}`.replace(/\b\w/g, char => char.toUpperCase());
  }
  return documentType.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export default function RegisterDocument({ catalog, onBack }: Props) {
  const selfClient = useSelfClient();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(catalog.selectedDocumentId || '');
  const [selectedDocument, setSelectedDocument] = useState<IDDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Update selected document when catalog changes (e.g., after generating a new mock)
  useEffect(() => {
    if (catalog.selectedDocumentId && catalog.selectedDocumentId !== selectedDocumentId) {
      setSelectedDocumentId(catalog.selectedDocumentId);
    }
  }, [catalog.selectedDocumentId]);

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

  const handleRegister = async () => {
    if (!selectedDocument) return;

    setRegistering(true);
    try {
      // TODO: Implement actual registration logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Coming Soon', 'Document registration is not yet implemented');
    } catch (err) {
      Alert.alert('Error', `Registration failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRegistering(false);
    }
  };

  // Filter to only unregistered documents and sort newest first
  const availableDocuments = (catalog.documents || []).filter(doc => !doc.isRegistered).reverse();

  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title="Register Document" onBack={onBack} />

      <View style={styles.content}>
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Select Document</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedDocumentId}
              onValueChange={(itemValue: string) => setSelectedDocumentId(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
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
