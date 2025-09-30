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

export default function ActivityHistory({ onBack }: Props) {
  const mockActivities = [
    {
      id: '1',
      type: 'Proof Shared',
      description: 'Age verification proof shared with Example Corp',
      timestamp: '2024-03-20 14:30',
      status: 'success',
    },
    {
      id: '2',
      type: 'Document Registered',
      description: 'US Passport registered and verified',
      timestamp: '2024-03-15 10:15',
      status: 'success',
    },
    {
      id: '3',
      type: 'Proof Generated',
      description: 'Citizenship proof generated for verification',
      timestamp: '2024-03-12 16:45',
      status: 'success',
    },
    {
      id: '4',
      type: 'Verification Failed',
      description: 'Document scan could not be verified',
      timestamp: '2024-03-08 11:20',
      status: 'error',
    },
  ];

  const ActivityCard = ({ activity }: { activity: (typeof mockActivities)[0] }) => (
    <View style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={styles.activityTitleRow}>
          <Text style={styles.activityType}>
            {getActivityIcon(activity.type)} {activity.type}
          </Text>
          <View style={[styles.statusDot, activity.status === 'success' ? styles.successDot : styles.errorDot]} />
        </View>
        <Text style={styles.timestamp}>{activity.timestamp}</Text>
      </View>
      <Text style={styles.activityDescription}>{activity.description}</Text>
    </View>
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Proof Shared':
        return '📤';
      case 'Document Registered':
        return '📄';
      case 'Proof Generated':
        return '✅';
      case 'Verification Failed':
        return '❌';
      default:
        return '📋';
    }
  };

  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title="📊 Proof History" subtitle="Your verification activity timeline" onBack={onBack} />

      <View style={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Total Proofs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Documents</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>

        {mockActivities.map(activity => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}

        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>✨ This is a demo interface</Text>
          <Text style={styles.emptySubtext}>
            In a real app, this would show your actual proof and verification history
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
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0969da',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    marginBottom: 8,
  },
  activityTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  successDot: {
    backgroundColor: '#28a745',
  },
  errorDot: {
    backgroundColor: '#dc3545',
  },
  timestamp: {
    fontSize: 12,
    color: '#777',
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
    color: '#0969da',
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
