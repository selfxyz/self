// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect } from 'react';

import { useSelfClient } from '../../context';
import { loadSelectedDocument } from '../../documents/utils';

/*Add a comment on lines R7 to R9Add diff commentMarkdown input:  edit mode selected.WritePreviewAdd a suggestionHeadingBoldItalicQuoteCodeLinkUnordered listNumbered listTask listMentionReferenceSaved repliesAdd FilesPaste, drop, or click to add filesCancelCommentStart a reviewReturn to code
  Display this to users before they confirm ownership of a document
*/
export function getPreRegistrationDescription() {
  return "By continuing, you certify that this passport, biometric ID or Aadhaar card belongs to you and is not stolen or forged. Once registered with Self, this document will be permanently linked to your identity and can't be linked to another one.";
}

/*
  Hook to prepare for proving a document by initializing the proving state machine.
  It loads the selected document and initializes the proving process based on the document type.
  returns functions to set FCM token and mark user confirmation, along with a boolean indicating readiness to prove.

  Usage:
    use `isReadyToProve` to enable/disable the confirmation button.
    call `setUserConfirmed` when the user presses your confirm button.
    after calling `setUserConfirmed`, the proving process will start. You MUST Navigate to wait-generation screen.
*/
export function usePrepareDocumentProof() {
  const selfClient = useSelfClient();
  const { useProvingStore } = selfClient;
  const currentState = useProvingStore(state => state.currentState);
  const init = useProvingStore(state => state.init);
  const setUserConfirmed = useProvingStore(state => state.setUserConfirmed);
  const isReadyToProve = currentState === 'ready_to_prove';

  useEffect(() => {
    const initializeProving = async () => {
      try {
        const selectedDocument = await loadSelectedDocument(selfClient);
        if (selectedDocument?.data?.documentCategory === 'aadhaar') {
          init(selfClient, 'register');
        } else {
          init(selfClient, 'dsc');
        }
      } catch (error) {
        console.error('Error loading selected document:', error);
        init(selfClient, 'dsc');
      }
    };

    initializeProving();
  }, [init, selfClient]);

  return { setUserConfirmed, isReadyToProve };
}
