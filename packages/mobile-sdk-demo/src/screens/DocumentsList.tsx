// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import SafeAreaScrollView from '../components/SafeAreaScrollView';
import StandardHeader from '../components/StandardHeader';

type Props = {
  onBack: () => void;
};

export default function DocumentsList({ onBack }: Props) {
  const mockDocuments = [
    {
      id: 'abc123def456',
      documentType: 'mock_passport',
      documentCategory: 'PASSPORT',
      nationality: 'USA',
      isRegistered: true,
      mock: true,
      createdAt: '2024-03-20T14:30:00Z',
      name: 'JANE DOE',
      birthDate: '1990-05-15',
      documentNumber: 'N1234567890',
    },
  ];

  const DocumentCard = ({ document }: { document: (typeof mockDocuments)[0] }) => {
    const getDocumentTypeDisplay = () => {
      if (document.mock) {
        return `Mock ${document.documentCategory.charAt(0) + document.documentCategory.slice(1).toLowerCase()}`;
      }
      return document.documentCategory.charAt(0) + document.documentCategory.slice(1).toLowerCase();
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    return (
      <View style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <Text style={styles.documentType}>{getDocumentTypeDisplay()}</Text>
          <View style={[styles.statusBadge, document.isRegistered ? styles.verified : styles.pending]}>
            <Text style={styles.statusText}>{document.isRegistered ? 'Registered' : 'Pending'}</Text>
          </View>
        </View>
        <Text style={styles.documentCountry}>
          {document.nationality} • {document.name}
        </Text>
        <Text style={styles.documentNumber}>Document: {document.documentNumber}</Text>
        <Text style={styles.documentDate}>Created: {formatDate(document.createdAt)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title="My Documents" subtitle="Your registered identity documents" onBack={onBack} />

      <View style={styles.content}>
        {mockDocuments.map(document => (
          <DocumentCard key={document.id} document={document} />
        ))}

        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>✨ Demo Document Registry</Text>
          <Text style={styles.emptySubtext}>
            This shows your mock passport that was generated and registered through the demo flow
          </Text>
        </View>
      </View>
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
  documentCountry: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  documentNumber: {
    fontSize: 14,
    color: '#777',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 14,
    color: '#777',
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
});
