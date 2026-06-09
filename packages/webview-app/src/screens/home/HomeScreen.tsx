// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { GearIcon, HomeScreen as EuclidHomeScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { mockDocumentStore } from '../../utils/mockDocumentStore';
import { getIdCardProps } from '../../utils/provingUtils';

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
  const location = useLocation();
  const { documents, analytics, haptic } = useSelfClient();
  const [catalog, setCatalog] = useState<DocumentCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const mockCatalog = useSyncExternalStore(mockDocumentStore.subscribe, () => mockDocumentStore.getCatalog());

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

  const allDocuments = [...(catalog?.documents ?? []), ...mockCatalog.documents];
  const hasDocuments = allDocuments.length > 0;
  const firstDoc = hasDocuments ? allDocuments[0] : undefined;
  const skipOnboardingRedirect = Boolean(
    (location.state as { skipOnboardingRedirect?: boolean } | null)?.skipOnboardingRedirect,
  );

  useEffect(() => {
    if (!loading && !hasDocuments && !skipOnboardingRedirect) {
      navigate('/tour/1', { replace: true });
    }
  }, [hasDocuments, loading, navigate, skipOnboardingRedirect]);

  const onAddDocument = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('home_add_document_pressed');
    navigate('/tour/1');
  }, [navigate, haptic, analytics]);

  const onSettings = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

  const onRestartOnboarding = useCallback(() => {
    haptic.trigger('selection');
    mockDocumentStore.clear();
    navigate('/tour/1');
  }, [haptic, navigate]);

  if (loading || (!hasDocuments && !skipOnboardingRedirect)) {
    return (
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid #E2E8F0',
            borderTopColor: '#000000',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <>
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={onRestartOnboarding}
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            border: '1px solid rgba(15, 23, 42, 0.16)',
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.94)',
            color: '#0F172A',
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
          }}
        >
          Restart onboarding
        </button>
      )}
      <EuclidHomeScreen
        {...WEB_SAFE_AREA}
        idCard={
          firstDoc
            ? {
                ...getIdCardProps(firstDoc.documentCategory, firstDoc.mock),
                subtitle: firstDoc.isRegistered ? 'Registered' : 'Pending registration',
              }
            : undefined
        }
        pointsCardProps={{ points: 0 }}
        showAddIdCTA={!hasDocuments}
        onAddIdPress={onAddDocument}
        topNavigationPrimaryButton={{
          variant: 'secondary-icon',
          icon: ({ size, color }) => <GearIcon size={size} color={color} />,
          onPress: onSettings,
        }}
      />
    </>
  );
};
