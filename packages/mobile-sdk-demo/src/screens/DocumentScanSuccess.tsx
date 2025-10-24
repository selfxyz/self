// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { IDDocument } from '@selfxyz/common/utils/types';

import ScreenLayout from '../components/ScreenLayout';

type Props = {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  document?: IDDocument;
};

export default function DocumentScanSuccess({ onBack, onNavigate, document }: Props) {
  const handleViewDocuments = () => {
    onNavigate('documents');
  };

  const handleScanAnother = () => {
    onBack();
  };

  // Extract document details for display
  const getDocumentInfo = () => {
    if (!document) {
      return {
        documentNumber: 'Unknown',
        documentType: 'Unknown',
        country: 'Unknown',
        expiryDate: 'Unknown',
      };
    }

    // Only PassportData has mrz property, check documentCategory to narrow type
    if (document.documentCategory !== 'passport' && document.documentCategory !== 'id_card') {
      // Handle Aadhaar or other document types that don't have MRZ
      return {
        documentNumber: 'N/A',
        documentType: document.documentCategory,
        country: 'N/A',
        expiryDate: 'N/A',
      };
    }

    // Parse MRZ to extract information
    const mrz = document.mrz || '';
    let documentNumber = 'Unknown';
    let documentType = 'Unknown';
    let country = 'Unknown';
    let expiryDate = 'Unknown';

    if (mrz.length >= 44) {
      // Extract from TD3 (passport) format
      documentType = mrz.substring(0, 2).trim();
      country = mrz.substring(2, 5).trim();

      if (mrz.length === 88) {
        // Passport format (TD3)
        documentNumber = mrz.substring(44, 53).replace(/</g, '').trim();
        const expiryDateRaw = mrz.substring(65, 71);
        expiryDate = formatDate(expiryDateRaw);
      } else if (mrz.length === 90) {
        // ID card format (TD1)
        documentNumber = mrz.substring(5, 14).replace(/</g, '').trim();
        const expiryDateRaw = mrz.substring(38, 44);
        expiryDate = formatDate(expiryDateRaw);
      }
    }

    return {
      documentNumber,
      documentType: documentType === 'P' ? 'Passport' : documentType === 'I' ? 'ID Card' : documentType,
      country,
      expiryDate,
    };
  };

  const formatDate = (dateStr: string): string => {
    if (dateStr.length !== 6) return dateStr;
    const year = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${fullYear}-${month}-${day}`;
  };

  const info = getDocumentInfo();

  return (
    <ScreenLayout title="Success!" onBack={onBack} contentStyle={styles.screenContent}>
      <View style={styles.contentWrapper}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Document Verified</Text>
          <Text style={styles.successSubtitle}>
            Your document has been successfully scanned and verified using NFC chip authentication.
          </Text>
        </View>

        <View style={styles.documentInfoContainer}>
          <Text style={styles.sectionTitle}>Document Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type:</Text>
            <Text style={styles.infoValue}>{info.documentType}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Country:</Text>
            <Text style={styles.infoValue}>{info.country}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Document Number:</Text>
            <Text style={styles.infoValue}>{info.documentNumber}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expiry Date:</Text>
            <Text style={styles.infoValue}>{info.expiryDate}</Text>
          </View>
        </View>

        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            Your document data is stored securely on your device and can be used for identity verification.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity accessibilityRole="button" onPress={handleViewDocuments} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>View Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" onPress={handleScanAnother} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Scan Another Document</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: 16,
  },
  contentWrapper: {
    flex: 1,
    gap: 24,
  },
  successContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successIconText: {
    fontSize: 48,
    color: '#16a34a',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  documentInfoContainer: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  noteContainer: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  noteText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  actions: {
    gap: 12,
    marginTop: 'auto',
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
});
