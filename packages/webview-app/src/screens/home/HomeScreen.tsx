// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  ScrollView,
  Spinner,
  Text,
  View,
  XStack,
  YStack,
} from 'tamagui';

import { useSelfClient } from '../../providers/SelfClientProvider';

interface DocumentEntry {
  id: string;
  documentType: string;
  documentCategory: string;
  data: string;
  mock: boolean;
  isRegistered?: boolean;
}

interface DocumentCatalog {
  documents: DocumentEntry[];
  selectedDocumentId?: string;
}

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { documents, analytics, haptic } = useSelfClient();
  const [catalog, setCatalog] = useState<DocumentCatalog | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    try {
      const result = await documents.loadDocumentCatalog();
      setCatalog(result as DocumentCatalog);
    } catch {
      setCatalog({ documents: [] });
    } finally {
      setLoading(false);
    }
  }, [documents]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const hasDocuments = catalog && catalog.documents.length > 0;

  const onAddDocument = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('home_add_document_pressed');
    navigate('/onboarding/country');
  }, [navigate, haptic, analytics]);

  const onSettings = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

  return (
    <YStack flex={1} backgroundColor="#F8FAFC">
      {/* Header */}
      <XStack
        paddingHorizontal={20}
        paddingTop={20}
        paddingBottom={16}
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack alignItems="center" gap={8}>
          <View
            width={32}
            height={32}
            borderRadius={8}
            backgroundColor="#000000"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={16} color="#ffffff" fontFamily="DINOT-Medium">
              S
            </Text>
          </View>
          <Text fontFamily="Advercase-Regular" fontSize={20} color="#000000">
            Self
          </Text>
        </XStack>
        <Button
          unstyled
          onPress={onSettings}
          pressStyle={{ opacity: 0.7 }}
          cursor="pointer"
        >
          <Text fontSize={20}>⚙️</Text>
        </Button>
      </XStack>

      <ScrollView flex={1} paddingHorizontal={20}>
        {loading ? (
          <YStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            paddingTop={100}
          >
            <Spinner size="large" color="#000000" />
          </YStack>
        ) : hasDocuments ? (
          <YStack gap={16} paddingTop={8}>
            {/* Document cards */}
            {catalog.documents.map(doc => (
              <YStack
                key={doc.id}
                backgroundColor="#ffffff"
                borderRadius={16}
                padding={20}
                borderWidth={1}
                borderColor="#CBD5E1"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack gap={4}>
                    <Text
                      fontFamily="DINOT-Medium"
                      fontSize={18}
                      color="#000000"
                    >
                      {doc.documentCategory === 'passport'
                        ? 'Passport'
                        : doc.documentCategory === 'id_card'
                          ? 'ID Card'
                          : doc.documentCategory}
                    </Text>
                    <Text
                      fontFamily="DINOT-Medium"
                      fontSize={13}
                      color="#94A3B8"
                    >
                      {doc.isRegistered ? 'Registered' : 'Pending registration'}
                    </Text>
                  </YStack>
                  <View
                    width={40}
                    height={40}
                    borderRadius={20}
                    backgroundColor={doc.isRegistered ? '#DCFCE7' : '#FEF3C7'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize={20}>{doc.isRegistered ? '✓' : '⏳'}</Text>
                  </View>
                </XStack>
              </YStack>
            ))}

            {/* Add another document */}
            <Button
              backgroundColor="transparent"
              borderWidth={1}
              borderColor="#CBD5E1"
              borderRadius={12}
              height={52}
              fontFamily="DINOT-Medium"
              color="#000000"
              borderStyle="dashed"
              onPress={onAddDocument}
              pressStyle={{ opacity: 0.7 }}
            >
              + Add Document
            </Button>
          </YStack>
        ) : (
          /* Empty state */
          <YStack alignItems="center" paddingTop={80} gap={24}>
            <View
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor="#E2E8F0"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={36}>🪪</Text>
            </View>
            <Text
              fontFamily="Advercase-Regular"
              fontSize={24}
              color="#000000"
              textAlign="center"
            >
              No documents yet
            </Text>
            <Text
              fontFamily="DINOT-Medium"
              fontSize={14}
              color="#64748B"
              textAlign="center"
              paddingHorizontal={24}
            >
              Add your first identity document to get started with Self.
            </Text>
            <Button
              backgroundColor="#000000"
              color="#ffffff"
              fontFamily="DINOT-Medium"
              borderRadius={12}
              height={52}
              width="100%"
              onPress={onAddDocument}
              pressStyle={{ opacity: 0.7 }}
            >
              Add Document
            </Button>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
};
