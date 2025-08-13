// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

import FeedbackModal from '../components/FeedbackModal';
import type { FeedbackType } from '../hooks/useFeedbackModal';
import { useFeedbackModal } from '../hooks/useFeedbackModal';

interface FeedbackContextType {
  showFeedbackModal: (type?: FeedbackType) => void;
  submitFeedback: (
    feedback: string,
    category: string,
    name?: string,
    email?: string,
  ) => Promise<void>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(
  undefined,
);

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({
  children,
}) => {
  const { isVisible, showFeedbackModal, hideFeedbackModal, submitFeedback } =
    useFeedbackModal();

  return (
    <FeedbackContext.Provider
      value={{
        showFeedbackModal,
        submitFeedback,
      }}
    >
      {children}

      <FeedbackModal
        visible={isVisible}
        onClose={hideFeedbackModal}
        onSubmit={submitFeedback}
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
