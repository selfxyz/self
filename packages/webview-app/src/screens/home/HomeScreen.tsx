// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { IDCardVariant } from '@selfxyz/euclid';
import { GearIcon, HomeScreen as EuclidHomeScreen } from '@selfxyz/euclid';

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

const docCategoryToVariant = (category: string): IDCardVariant => {
  switch (category) {
    case 'passport':
      return 'passport';
    case 'id_card':
      return 'id-card';
    case 'aadhaar':
      return 'aadhaar';
    default:
      return 'unverified-id';
  }
};

const docCategoryToTitle = (category: string): string => {
  switch (category) {
    case 'passport':
      return 'Passport';
    case 'id_card':
      return 'ID Card';
    case 'aadhaar':
      return 'Aadhaar';
    default:
      return category;
  }
};

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const firstDoc = hasDocuments ? catalog.documents[0] : undefined;
  const skipOnboardingRedirect = Boolean(
    (location.state as { skipOnboardingRedirect?: boolean } | null)?.skipOnboardingRedirect,
  );

  useEffect(() => {
    if (!loading && !hasDocuments && !skipOnboardingRedirect) {
      navigate('/onboarding/tour/1', { replace: true });
    }
  }, [hasDocuments, loading, navigate, skipOnboardingRedirect]);

  const onAddDocument = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('home_add_document_pressed');
    navigate('/onboarding/tour/1');
  }, [navigate, haptic, analytics]);

  const onSettings = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

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
    <EuclidHomeScreen
      insets={{ top: 0, bottom: 0 }}
      idCard={
        firstDoc
          ? {
              variant: docCategoryToVariant(firstDoc.documentCategory),
              title: docCategoryToTitle(firstDoc.documentCategory),
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
  );
};
