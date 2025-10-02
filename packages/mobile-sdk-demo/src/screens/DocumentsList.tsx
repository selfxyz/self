// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { DocumentCatalog } from '@selfxyz/common/dist/esm/src/utils/types.js';
// no direct SDK calls here

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
  const { documents, loading, error, deleting, deleteDocument, refresh } = useDocuments();

  // Refresh when catalog selection changes (e.g., after generation or external updates)
  useEffect(() => {
    refresh();
  }, [catalog.selectedDocumentId, refresh]);

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
          <Text style={styles.emptyText}>No documents yet</Text>
          <Text style={styles.emptySubtext}>
            Generate a mock document to see it appear here. The demo document store keeps everything locally on your
            device.
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

      return (
        <View key={metadata.id} style={styles.documentCard}>
          <View style={styles.documentHeader}>
            <Text style={styles.documentType}>{humanizeDocumentType(metadata.documentType)}</Text>
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
          <Text style={styles.documentMeta}>{(metadata.documentCategory ?? 'unknown').toUpperCase()}</Text>
          <Text style={styles.documentMeta}>{metadata.mock ? 'Mock data' : 'Live data'}</Text>
          <Text style={styles.documentPreview} selectable>
            {preview}
          </Text>
          <Text style={styles.documentIdLabel}>Document ID</Text>
          <Text style={styles.documentId}>{documentId}</Text>
        </View>
      );
    });
  }, [documents, error, loading, deleting]);

  return (
    <ScreenLayout title="My Documents" onBack={onBack}>
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
  documentType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
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
