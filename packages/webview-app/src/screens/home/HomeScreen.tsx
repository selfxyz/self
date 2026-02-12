import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, YStack, XStack, Button, ScrollView, Spinner } from 'tamagui';
import { useNavigate } from 'react-router-dom';

import {
  black,
  blue600,
  slate50,
  slate300,
  slate500,
  white,
  amber50,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { useSelfClient } from '../../providers/SelfClientProvider';

interface DocumentInfo {
  id: string;
  name: string;
  status: 'registered' | 'pending' | 'unregistered';
}

export const HomeScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selfPoints] = useState(0);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await selfClient.adapters.documents.loadDocumentCatalog();
      const catalogDocs = (catalog as { documents?: Array<Record<string, unknown>> })?.documents ?? [];
      const docs: DocumentInfo[] = catalogDocs.map(
        (doc) => ({
          id: String(doc.id ?? ''),
          name: String(doc.name ?? 'Identity Document'),
          status: doc.isRegistered ? 'registered' as const : 'unregistered' as const,
        }),
      );
      setDocuments(docs);
    } catch (error) {
      console.warn('Failed to load documents:', error);
      setDocuments([]);
    }
    setLoading(false);
  }, [selfClient]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  if (loading) {
    return (
      <YStack
        backgroundColor={slate50}
        flex={1}
        justifyContent="center"
        alignItems="center"
      >
        <Spinner size="large" color={black} />
      </YStack>
    );
  }

  return (
    <YStack backgroundColor="#F8FAFC" flex={1} alignItems="center">
      <ScrollView
        showsVerticalScrollIndicator={false}
        flex={1}
        contentContainerStyle={{
          gap: 15,
          paddingVertical: 20,
          paddingHorizontal: 15,
          paddingBottom: 35,
        }}
      >
        {/* Empty state when no documents */}
        {documents.length === 0 && (
          <YStack
            backgroundColor={white}
            borderRadius={16}
            elevation={4}
            padding={20}
            gap={16}
            alignItems="center"
          >
            <YStack gap={8} alignItems="center" paddingVertical={20}>
              <Text
                fontFamily={dinot}
                fontSize={20}
                fontWeight="500"
                color={black}
                textAlign="center"
              >
                No documents yet
              </Text>
              <Text
                fontFamily={dinot}
                fontSize={16}
                fontWeight="500"
                color={slate500}
                textAlign="center"
                paddingHorizontal={20}
              >
                Register your first identity document to get started with Self.
              </Text>
            </YStack>
            <Button
              backgroundColor={black}
              borderRadius={12}
              paddingVertical={16}
              paddingHorizontal={24}
              width="100%"
              pressStyle={{ opacity: 0.8 }}
              onPress={() => navigate('/onboarding/country')}
            >
              <Text
                fontFamily={dinot}
                fontSize={18}
                fontWeight="500"
                color={amber50}
                textAlign="center"
              >
                Register document
              </Text>
            </Button>
          </YStack>
        )}

        {/* Document cards */}
        {documents.map((doc) => (
          <YStack
            key={doc.id}
            backgroundColor={white}
            borderRadius={16}
            elevation={4}
            padding={20}
            gap={8}
            pressStyle={{ opacity: 0.8 }}
            onPress={() => navigate(`/onboarding/confirm`)}
          >
            <Text
              fontFamily={dinot}
              fontSize={18}
              fontWeight="500"
              color={black}
            >
              {doc.name}
            </Text>
            <Text
              fontFamily={dinot}
              fontSize={14}
              fontWeight="500"
              color={doc.status === 'registered' ? '#16A34A' : slate500}
              textTransform="uppercase"
            >
              {doc.status === 'registered'
                ? 'Registered'
                : doc.status === 'pending'
                  ? 'Pending'
                  : 'Unregistered'}
            </Text>
          </YStack>
        ))}
      </ScrollView>

      {/* Bottom sticky section */}
      <YStack
        elevation={8}
        backgroundColor={white}
        width="100%"
        paddingTop={20}
        paddingHorizontal={20}
        paddingBottom={24}
        borderTopLeftRadius={18}
        borderTopRightRadius={18}
        style={{
          boxShadow: '0 -6px 14px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <XStack marginBottom={32} gap={22}>
          <View
            width={68}
            height={68}
            borderRadius={12}
            borderWidth={1}
            borderColor={slate300}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              fontFamily={dinot}
              fontSize={24}
              fontWeight="500"
              color={black}
            >
              S
            </Text>
          </View>
          <YStack gap={4} flex={1}>
            <Text
              color={black}
              fontFamily={dinot}
              fontSize={20}
              fontWeight="500"
              lineHeight={22}
              textTransform="uppercase"
            >
              {`${selfPoints} SELF POINTS`}
            </Text>
            <Text
              color={black}
              fontFamily={dinot}
              fontSize={16}
              fontWeight="500"
              lineHeight={22}
            >
              Earn points by referring friends, disclosing proof requests, and
              more.
            </Text>
          </YStack>
        </XStack>
        <Button
          backgroundColor={white}
          paddingHorizontal={22}
          paddingVertical={24}
          borderRadius={5}
          borderWidth={1}
          borderColor={slate300}
          pressStyle={{ opacity: 0.8 }}
          onPress={() => navigate('/coming-soon')}
        >
          <Text
            color={blue600}
            textAlign="center"
            fontFamily={dinot}
            fontSize={18}
            height={22}
          >
            Earn points
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
};
