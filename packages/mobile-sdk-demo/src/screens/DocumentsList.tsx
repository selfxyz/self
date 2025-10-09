// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { DocumentCatalog } from '@selfxyz/common/utils/types';
import { extractNameFromDocument, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import ScreenLayout from '../components/ScreenLayout';
import { formatDataPreview, humanizeDocumentType, maskId } from '../utils/document';
import { useDocuments } from '../hooks/useDocuments';

type Props = {
  onBack: () => void;
  catalog: DocumentCatalog;
};

// DocumentEntry type lives in hook; not needed here

// helpers moved to utils/document

export default function DocumentsList({ onBack, catalog }: Props) {
  const selfClient = useSelfClient();
  const { documents, loading, error, deleting, deleteDocument, refresh, clearing, clearAllDocuments } = useDocuments();
  const [documentNames, setDocumentNames] = useState<Record<string, { firstName: string; lastName: string }>>({});

  // Refresh when catalog selection changes (e.g., after generation or external updates)
  useEffect(() => {
    refresh();
  }, [catalog.selectedDocumentId, refresh]);

  // Load names for all documents
  useEffect(() => {
    let cancelled = false;

    const loadDocumentNames = async () => {
      const names: Record<string, { firstName: string; lastName: string }> = {};
      await Promise.all(
        documents.map(async doc => {
          const name = await extractNameFromDocument(selfClient, doc.metadata.id);
          if (name) {
            names[doc.metadata.id] = name;
          }
        }),
      );
      if (!cancelled) {
        setDocumentNames(names);
      }
    };

    if (documents.length === 0) {
      setDocumentNames({});
      return;
    }

    loadDocumentNames();

    return () => {
      cancelled = true;
    };
  }, [documents, selfClient]);

  const handleClearAll = () => {
    Alert.alert('Clear All Documents', 'Are you sure you want to delete all documents? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearAllDocuments();
          } catch (err) {
            Alert.alert('Error', `Failed to clear documents: ${err instanceof Error ? err.message : String(err)}`);
          }
        },
      },
    ]);
  };

  const handleDelete = async (documentId: string, documentType: string) => {
    Alert.alert('Delete Document', `Are you sure you want to delete this ${humanizeDocumentType(documentType)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(documentId);
          } catch (err) {
            Alert.alert('Error', `Failed to delete document: ${err instanceof Error ? err.message : String(err)}`);
          }
        },
      },
    ]);
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color="#0550ae" />
          <Text style={styles.loadingText}>Loading your documents…</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>We hit a snag fetching documents</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
        </View>
      );
    }

    if (documents.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No documents</Text>
          <Text style={styles.emptySubtext}>
            Generate a mock document or scan a real document to see it appear here.
          </Text>
        </View>
      );
    }

    return documents.map(({ metadata }) => {
      const statusLabel = metadata.isRegistered ? 'Registered' : 'Not registered';
      const badgeStyle = metadata.isRegistered ? styles.verified : styles.pending;
      const preview = formatDataPreview(metadata);
      const documentId = maskId(metadata.id);
      const isDeleting = deleting === metadata.id;
      const nameData = documentNames[metadata.id];
      const fullName = nameData ? `${nameData.firstName} ${nameData.lastName}`.trim() : null;

      return (
        <View key={metadata.id} style={styles.documentCard}>
          <View style={styles.documentHeader}>
            <View style={styles.documentTitleContainer}>
              <Text style={styles.documentType}>{humanizeDocumentType(metadata.documentType)}</Text>
              {fullName && <Text style={styles.documentName}>{fullName}</Text>}
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.statusBadge, badgeStyle]}>
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(metadata.id, metadata.documentType)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#dc3545" />
                ) : (
                  <Text style={styles.deleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.documentMeta}>{metadata.mock ? 'Mock data' : 'Live data'}</Text>
          <Text style={styles.documentPreview} selectable>
            {preview}
          </Text>
          <Text style={styles.documentIdLabel}>Document ID</Text>
          <Text style={styles.documentId}>{documentId}</Text>
        </View>
      );
    });
  }, [documents, error, loading, deleting, documentNames]);

  const clearButton = (
    <TouchableOpacity
      style={[styles.clearButton, (clearing || documents.length === 0) && styles.disabledButton]}
      onPress={handleClearAll}
      disabled={clearing || documents.length === 0}
    >
      {clearing ? (
        <ActivityIndicator size="small" color="#dc3545" />
      ) : (
        <Text style={styles.clearButtonText}>Clear All</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenLayout title="My Documents" onBack={onBack} rightAction={clearButton}>
      {content}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffeef0',
    borderWidth: 1,
    borderColor: '#dc3545',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 80,
    alignSelf: 'flex-end',
  },
  clearButtonText: {
    color: '#dc3545',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e5e9',
  },
  content: {
    flex: 1,
  },
  documentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  documentTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  documentType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  documentName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0550ae',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    minHeight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 11,
    color: '#dc3545',
    fontWeight: '500',
  },
  verified: {
    backgroundColor: '#d4edda',
  },
  pending: {
    backgroundColor: '#fff3cd',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  documentMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  documentPreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f6f8fa',
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#0d1117',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    lineHeight: 16,
  },
  documentIdLabel: {
    marginTop: 12,
    fontSize: 12,
    color: '#57606a',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  documentId: {
    fontSize: 14,
    color: '#0d1117',
    fontFamily: 'monospace',
  },
  emptyState: {
    marginTop: 32,
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#0550ae',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingState: {
    marginTop: 32,
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#57606a',
  },
});
