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

export default function ProofHistory({ onBack }: Props) {
  const mockActivities = [
    {
      id: '1',
      appName: 'DemoBank',
      description: 'Age verification',
      date: 'Mar 21, 2024',
      status: 'success',
      disclosures: ['Age over 18'],
    },
    {
      id: '2',
      appName: 'VerifyMe',
      description: 'Identity verification',
      date: 'Mar 16, 2024',
      status: 'success',
      disclosures: ['Name', 'Nationality', 'Age over 21'],
    },
    {
      id: '3',
      appName: 'TravelCheck',
      description: 'Passport verification',
      date: 'Mar 12, 2024',
      status: 'pending',
      disclosures: ['Nationality', 'Passport validity'],
    },
  ];

  const ActivityCard = ({ activity }: { activity: (typeof mockActivities)[0] }) => {
    return (
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <View style={styles.activityTitleRow}>
            <Text style={styles.activityType}>{activity.appName}</Text>
            <View
              style={[
                styles.statusDot,
                activity.status === 'success'
                  ? styles.successDot
                  : activity.status === 'pending'
                    ? styles.pendingDot
                    : styles.errorDot,
              ]}
            />
          </View>
          <Text style={styles.timestamp}>{activity.date}</Text>
        </View>
        <Text style={styles.activityDescription}>{activity.description}</Text>
        <Text style={styles.activityDisclosures}>Shared: {activity.disclosures.join(', ')}</Text>
      </View>
    );
  };

  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title="Proof History" onBack={onBack} />

      <View style={styles.content}>
        {mockActivities.map(activity => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}

        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>✨ Demo Proof History</Text>
          <Text style={styles.emptySubtext}>This shows sample verification activities from your mock passport</Text>
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
  pendingDot: {
    backgroundColor: '#ffc107',
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
    marginBottom: 4,
  },
  activityDisclosures: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
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
