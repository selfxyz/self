// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { NormalizedMRZResult } from '../utils/camera';
import { buildValidationRows, humanizeDocumentType } from '../utils/camera';

interface Props {
  result: NormalizedMRZResult;
}

export default function DocumentScanResultCard({ result }: Props) {
  const validationRows = useMemo(() => buildValidationRows(result.info.validation), [result]);

  return (
    <View style={styles.resultCard} accessible accessibilityRole="summary">
      <Text style={styles.resultTitle}>Scan summary</Text>

      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>Document number</Text>
        <Text style={styles.resultValue}>{result.info.documentNumber}</Text>
      </View>

      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>Document type</Text>
        <Text style={styles.resultValue}>{humanizeDocumentType(result.info.documentType)}</Text>
      </View>

      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>Issuing country</Text>
        <Text style={styles.resultValue}>{result.info.issuingCountry || 'Unknown'}</Text>
      </View>

      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>Date of birth</Text>
        <Text style={styles.resultValue}>{result.readableBirthDate}</Text>
      </View>

      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>Expiry date</Text>
        <Text style={styles.resultValue}>{result.readableExpiryDate}</Text>
      </View>

      <View style={styles.validationSection}>
        <Text style={styles.validationTitle}>Validation checks</Text>
        {validationRows ? (
          validationRows.map(row => (
            <View key={row.label} style={styles.validationRow}>
              <Text style={styles.validationLabel}>{row.label}</Text>
              <Text
                style={[styles.validationBadge, row.value ? styles.validationPass : styles.validationFail]}
                accessibilityRole="text"
              >
                {row.value ? '✓ Pass' : '✗ Fail'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.validationPlaceholder}>Validation details are not available for this scan yet.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    color: '#334155',
    fontWeight: '500',
    fontSize: 14,
  },
  resultValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  validationSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  validationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  validationLabel: {
    color: '#1f2937',
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  validationBadge: {
    minWidth: 90,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    fontWeight: '600',
    fontSize: 12,
    color: '#ffffff',
  },
  validationPass: {
    backgroundColor: '#16a34a',
  },
  validationFail: {
    backgroundColor: '#b91c1c',
  },
  validationPlaceholder: {
    color: '#475569',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
