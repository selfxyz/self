// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LeftArrowIcon, ManageDocumentsScreen as EuclidManageDocumentsScreen, PlusIcon } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const ManageDocumentsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const [dialogue, setDialogue] = useState<{ title: string; description: string } | undefined>();

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

  const onAddDocument = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('manage_docs_add_pressed');
    navigate('/onboarding/country');
  }, [navigate, haptic, analytics]);

  const onDocumentPress = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('manage_docs_document_pressed');
    navigate('/id-data');
  }, [haptic, analytics, navigate]);

  const onViewIdDetails = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('manage_docs_view_details');
    setDialogue(undefined);
    navigate('/id-data');
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
      documents={[
        {
          id: 'mock-passport',
          label: 'Passport',
          description: 'Registered',
          onPress: onDocumentPress,
        },
      ]}
      onBack={handleBack}
      onAddDocument={onAddDocument}
      dialogue={dialogue}
      onViewIdDetails={onViewIdDetails}
      onRemoveId={onRemoveId}
      onDismissDialogue={onDismissDialogue}
    />
  );
};
