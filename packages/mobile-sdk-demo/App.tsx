// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { DocumentCatalog, IDDocument } from '@selfxyz/common';

import { useSelfClient } from './src/selfClient/Provider';

type Screen = 'home' | 'register' | 'generate' | 'prove' | 'camera' | 'nfc' | 'onboarding' | 'qr';
type GenerateMockCmp = typeof import('./src/GenerateMock').default;
type RegisterDocumentCmp = typeof import('./src/RegisterDocument').default;
type ProveQRCodeCmp = typeof import('./src/ProveQRCode').default;

function App() {
  const selfClient = useSelfClient();
  const [screen, setScreen] = useState<Screen>('home');
  const [catalog, setCatalog] = useState<DocumentCatalog>({ documents: [] });
  const [selectedDocument, setSelectedDocument] = useState<IDDocument | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const triggerCatalogRefresh = useCallback(() => {
    setRefreshToken(previous => previous + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const nextCatalog = await selfClient.loadDocumentCatalog();
      if (cancelled) {
        return;
      }

      setCatalog(nextCatalog);

      const selectedId = nextCatalog.selectedDocumentId ?? nextCatalog.documents[0]?.id;
      if (selectedId) {
        const data = await selfClient.loadDocumentById(selectedId);
        if (!cancelled) {
          setSelectedDocument(data);
        }
      } else if (!cancelled) {
        setSelectedDocument(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshToken, selfClient]);

  const hasDocuments = catalog.documents.length > 0;

  const screenDescriptors = useMemo(
    () => [
      { label: 'Generate Mock Data', screen: 'generate' as const, status: '✅', enabled: true },
      {
        label: 'Register Document',
        screen: 'register' as const,
        status: hasDocuments ? '✅' : '⏳',
        enabled: hasDocuments,
      },
      {
        label: 'Prove QR Code',
        screen: 'prove' as const,
        status: hasDocuments ? '✅' : '⏳',
        enabled: hasDocuments,
      },
    ],
    [hasDocuments],
  );

  const navigate = useCallback(
    (next: Screen) => {
      if (!hasDocuments && (next === 'register' || next === 'prove')) {
        return;
      }
      setScreen(next);
    },
    [hasDocuments],
  );

  const handleBackToMenu = useCallback(() => {
    setScreen('home');
    triggerCatalogRefresh();
  }, [triggerCatalogRefresh]);

  if (screen === 'generate') {
    const GenerateMock = require('./src/GenerateMock').default as GenerateMockCmp;
    return (
      <GenerateMock
        onPersist={triggerCatalogRefresh}
        onNavigate={navigate}
        onBack={handleBackToMenu}
      />
    );
  }

  if (screen === 'register') {
    const RegisterDocument = require('./src/RegisterDocument').default as RegisterDocumentCmp;
    return <RegisterDocument document={selectedDocument} onBack={handleBackToMenu} />;
  }

  if (screen === 'prove') {
    const ProveQRCode = require('./src/ProveQRCode').default as ProveQRCodeCmp;
    return <ProveQRCode document={selectedDocument} onBack={handleBackToMenu} />;
  }

  if (screen === 'camera') {
    const DocumentCamera = require('./src/DocumentCamera').default;
    return <DocumentCamera onBack={() => navigate('home')} />;
  }

  if (screen === 'nfc') {
    const DocumentNFCScan = require('./src/DocumentNFCScan').default;
    return <DocumentNFCScan onBack={() => navigate('home')} />;
  }

  if (screen === 'onboarding') {
    const DocumentOnboarding = require('./src/DocumentOnboarding').default;
    return <DocumentOnboarding onBack={() => navigate('home')} />;
  }

  if (screen === 'qr') {
    const QRCodeViewFinder = require('./src/QRCodeViewFinder').default;
    return <QRCodeViewFinder onBack={() => navigate('home')} />;
  }

  const MenuButton = ({
    title,
    onPress,
    isWorking = false,
    disabled = false,
  }: {
    title: string;
    onPress: () => void;
    isWorking?: boolean;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.menuButton,
        isWorking ? styles.workingButton : styles.placeholderButton,
        disabled ? styles.disabledButton : null,
      ]}
      onPress={() => {
        if (!disabled) {
          onPress();
        }
      }}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text style={[styles.menuButtonText, isWorking ? styles.workingButtonText : styles.placeholderButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Self Demo App</Text>
        <Text style={styles.subtitle}>Mobile SDK Alpha - Available Screens</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Core Features</Text>
        {screenDescriptors.map(descriptor => (
          <MenuButton
            key={descriptor.screen}
            title={`${descriptor.status} ${descriptor.label}`}
            onPress={() => navigate(descriptor.screen)}
            isWorking={descriptor.status === '✅'}
            disabled={!descriptor.enabled}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📷 Document Scanning</Text>
        <MenuButton title="⏳ Document Camera" onPress={() => navigate('camera')} />
        <MenuButton title="⏳ Document NFC Scan" onPress={() => navigate('nfc')} />
        <MenuButton title="⏳ Document Onboarding" onPress={() => navigate('onboarding')} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 QR Code Features</Text>
        <MenuButton title="⏳ QR Code View Finder" onPress={() => navigate('qr')} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>✅ Working | ⏳ Placeholder (Not Implemented)</Text>
        <Text style={styles.footerSubtext}>Tap any screen to explore the demo interface</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  menuButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  workingButton: {
    backgroundColor: '#007AFF',
  },
  placeholderButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  disabledButton: {
    opacity: 0.6,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  workingButtonText: {
    color: '#fff',
  },
  placeholderButtonText: {
    color: '#666',
  },
  footer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  footerText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  footerSubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
  },
});

export default App;
