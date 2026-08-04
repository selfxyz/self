// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ChevronRightIcon,
  LeftArrowIcon,
  ManageDocumentsScreen as EuclidManageDocumentsScreen,
  PlusIcon,
} from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { getIdCardProps } from '../../utils/provingUtils';

interface DocumentEntry {
  id: string;
  documentCategory: string;
  mock: boolean;
  isRegistered?: boolean;
}

interface Catalog {
  documents: DocumentEntry[];
  selectedDocumentId?: string | null;
}

export const ManageDocumentsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { documents, analytics, haptic } = useSelfClient();
  const [dialogue, setDialogue] = useState<{ title: string; description: string } | undefined>();
  const [catalog, setCatalog] = useState<Catalog>({ documents: [] });

  useEffect(() => {
    let cancelled = false;
    documents
      .loadDocumentCatalog()
      .then(loaded => {
        if (!cancelled) setCatalog(loaded as Catalog);
      })
      .catch(() => {
        if (!cancelled) setCatalog({ documents: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [documents]);

  // Mirrors the phone app: tapping a row selects it in place (radio indicator
  // flips); nothing pops. Unregistered documents explain why they cannot be
  // selected. Details live behind the row's chevron.
  const selectDocument = useCallback(
    (doc: DocumentEntry) => {
      haptic.trigger('selection');
      if (!doc.isRegistered) {
        setDialogue({
          title: getIdCardProps(doc.documentCategory, doc.mock).title ?? 'Document',
          description: 'This document is not registered yet, so it cannot be used for proofs.',
        });
        return;
      }
      if (doc.id === catalog.selectedDocumentId) return;
      analytics.trackEvent('manage_docs_document_selected');
      const updated = { ...catalog, selectedDocumentId: doc.id };
      setCatalog(updated);
      void documents.saveDocumentCatalog(updated as Parameters<typeof documents.saveDocumentCatalog>[0]);
    },
    [catalog, documents, haptic, analytics],
  );

  const openDocumentActions = useCallback(
    (doc: DocumentEntry) => {
      haptic.trigger('selection');
      analytics.trackEvent('manage_docs_actions_opened');
      setDialogue({
        title: getIdCardProps(doc.documentCategory, doc.mock).title ?? 'Document',
        description: doc.isRegistered ? 'Registered' : 'Pending registration',
      });
    },
    [haptic, analytics],
  );

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

  const onAddDocument = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('manage_docs_add_pressed');
    navigate('/pick-country');
  }, [navigate, haptic, analytics]);

  const onViewIdDetails = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('manage_docs_view_details');
    setDialogue(undefined);
    navigate('/docs/current');
  }, [navigate, haptic, analytics]);

  const onRemoveId = useCallback(() => {
    haptic.trigger('warning');
    analytics.trackEvent('manage_docs_remove_pressed');
    setDialogue(undefined);
  }, [haptic, analytics]);

  const onDismissDialogue = useCallback(() => {
    haptic.trigger('selection');
    setDialogue(undefined);
  }, [haptic]);

  return (
    <EuclidManageDocumentsScreen
      insets={WEB_SAFE_AREA.insets}
      escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      addIcon={({ size, color }) => <PlusIcon size={size} color={color} />}
      activeDocumentId={catalog.selectedDocumentId ?? undefined}
      documents={catalog.documents.map(doc => ({
        id: doc.id,
        label: getIdCardProps(doc.documentCategory, doc.mock).title ?? 'Document',
        description: doc.isRegistered ? 'Registered' : 'Pending registration',
        badge: (
          <button
            type="button"
            aria-label="Document details"
            onClick={event => {
              event.stopPropagation();
              openDocumentActions(doc);
            }}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}
          >
            <ChevronRightIcon size={20} color="#94A3B8" />
          </button>
        ),
        onPress: () => selectDocument(doc),
      }))}
      onBack={handleBack}
      onAddDocument={onAddDocument}
      dialogue={dialogue}
      onViewIdDetails={onViewIdDetails}
      onRemoveId={onRemoveId}
      onDismissDialogue={onDismissDialogue}
    />
  );
};
