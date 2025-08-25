// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

import FeedbackModal from '@/components/FeedbackModal';
import type { FeedbackModalScreenParams } from '@/components/FeedbackModalScreen';
import FeedbackModalScreen from '@/components/FeedbackModalScreen';
import type { FeedbackType } from '@/hooks/useFeedbackModal';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';

interface FeedbackContextType {
  showFeedbackModal: (type?: FeedbackType) => void;
  submitFeedback: (
    feedback: string,
    category: string,
    name?: string,
    email?: string,
  ) => Promise<void>;
  showModal: (params: FeedbackModalScreenParams) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(
  undefined,
);

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({
  children,
}) => {
  const {
    isVisible,
    showFeedbackModal,
    hideFeedbackModal,
    submitFeedback,
    isModalVisible,
    modalParams,
    showModal,
    hideModal,
  } = useFeedbackModal();

  return (
    <FeedbackContext.Provider
      value={{
        showFeedbackModal,
        submitFeedback,
        showModal,
      }}
    >
      {children}

      <FeedbackModal
        visible={isVisible}
        onClose={hideFeedbackModal}
        onSubmit={submitFeedback}
      />

      <FeedbackModalScreen
        visible={isModalVisible}
        modalParams={modalParams}
        onHideModal={hideModal}
      />
    </FeedbackContext.Provider>
  );
};

interface FeedbackProviderProps {
  children: ReactNode;
}

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};
