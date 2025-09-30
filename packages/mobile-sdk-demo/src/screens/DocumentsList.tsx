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
    { id: '1', type: 'Passport', country: '🇺🇸 United States', status: 'Verified', date: '2024-03-15' },
    { id: '2', type: 'EU ID Card', country: '🇩🇪 Germany', status: 'Pending', date: '2024-03-18' },
    { id: '3', type: 'Passport', country: '🇨🇦 Canada', status: 'Verified', date: '2024-03-20' },
  ];

  const DocumentCard = ({ document }: { document: (typeof mockDocuments)[0] }) => (
    <View style={styles.documentCard}>
      <View style={styles.documentHeader}>
        <Text style={styles.documentType}>{document.type}</Text>
        <View style={[styles.statusBadge, document.status === 'Verified' ? styles.verified : styles.pending]}>
          <Text style={styles.statusText}>{document.status}</Text>
        </View>
      </View>
      <Text style={styles.documentCountry}>{document.country}</Text>
      <Text style={styles.documentDate}>Registered: {document.date}</Text>
    </View>
  );

  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title="📄 My Documents" subtitle="Your registered identity documents" onBack={onBack} />

      <View style={styles.content}>
        {mockDocuments.map(document => (
          <DocumentCard key={document.id} document={document} />
        ))}

        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>✨ This is a demo interface</Text>
          <Text style={styles.emptySubtext}>In a real app, this would show your actual registered documents</Text>
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
