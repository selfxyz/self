// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { DocumentCatalog, DocumentMetadata, IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';
import { getAllDocuments, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import SafeAreaScrollView from '../components/SafeAreaScrollView';
import StandardHeader from '../components/StandardHeader';

type Props = {
  onBack: () => void;
  catalog: DocumentCatalog;
};

type DocumentEntry = {
  metadata: DocumentMetadata;
  data: IDDocument;
};

const humanizeDocumentType = (documentType: string) => {
  if (documentType.startsWith('mock_')) {
    const base = documentType.replace('mock_', '');
    return `Mock ${base.replace('_', ' ')}`.replace(/\b\w/g, char => char.toUpperCase());
  }
  return documentType.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

const formatDataPreview = (metadata: DocumentMetadata) => {
  if (!metadata.data) {
    return 'No preview available';
  }

  const lines = metadata.data.split(/\r?\n/).filter(Boolean);
  const preview = lines.slice(0, 2).join('\n');

  return preview.length > 120 ? `${preview.slice(0, 117)}…` : preview;
};

export default function DocumentsList({ onBack, catalog }: Props) {
  const selfClient = useSelfClient();
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const allDocuments = await getAllDocuments(selfClient);
        if (!active) {
          return;
        }
        setDocuments(Object.values(allDocuments));
      } catch (err) {
        if (!active) {
          return;
        }
        setDocuments([]);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [selfClient, catalog]);

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
      const documentId = `${metadata.id.slice(0, 8)}…${metadata.id.slice(-6)}`;

      return (
        <View key={metadata.id} style={styles.documentCard}>
          <View style={styles.documentHeader}>
            <Text style={styles.documentType}>{humanizeDocumentType(metadata.documentType)}</Text>
            <View style={[styles.statusBadge, badgeStyle]}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.documentMeta}>{metadata.documentCategory.toUpperCase()}</Text>
          <Text style={styles.documentMeta}>{metadata.mock ? 'Mock data' : 'Live data'}</Text>
          <Text style={styles.documentPreview} selectable>
            {preview}
          </Text>
          <Text style={styles.documentIdLabel}>Document ID</Text>
          <Text style={styles.documentId}>{documentId}</Text>
        </View>
      );
    });
  }, [documents, error, loading]);

  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title="My Documents" subtitle="Documents stored in this demo app" onBack={onBack} />

      <View style={styles.content}>{content}</View>
    </SafeAreaScrollView>
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
    alignItems: 'center',
    marginBottom: 8,
  },
  documentType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
