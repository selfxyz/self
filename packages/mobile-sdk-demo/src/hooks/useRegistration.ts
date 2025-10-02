// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useState } from 'react';

import type { IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';
import { SdkEvents, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

export type RegistrationState = {
  registering: boolean;
  statusMessage: string;
  currentState: string;
  logs: string[];
  showLogs: boolean;
};

export function useRegistration() {
  const selfClient = useSelfClient();
  const { useProvingStore } = selfClient;
  const currentState = useProvingStore(state => state.currentState);
  const circuitType = useProvingStore(state => state.circuitType);
  const init = useProvingStore(state => state.init);
  const setUserConfirmed = useProvingStore(state => state.setUserConfirmed);

  const [registering, setRegistering] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const addLog = useCallback((message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    setLogs(prev => [`${emoji} [${timestamp}] ${message}`, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    if (!registering) return;
    const unsubscribe = selfClient.on(SdkEvents.PROOF_EVENT, payload => {
      if (!payload) return;
      const { event, level } = payload;
      addLog(event, level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info');
    });
    return () => unsubscribe();
  }, [selfClient, registering, addLog]);

  useEffect(() => {
    if (!registering) return;
    switch (currentState) {
      case 'fetching_data':
        setStatusMessage('📡 Fetching protocol data from network...');
        addLog('Fetching DSC/CSCA trees and circuits');
        break;
      case 'validating_document':
        setStatusMessage('🔍 Validating document authenticity...');
        addLog('Validating document signatures and checking registration status');
        break;
      case 'init_tee_connexion':
        setStatusMessage('🔐 Establishing secure TEE connection...');
        addLog('Connecting to Trusted Execution Environment');
        break;
      case 'ready_to_prove':
        setStatusMessage('⚡ Ready to generate proof...');
        addLog('TEE connection established, auto-confirming proof generation');
        setTimeout(() => {
          setUserConfirmed(selfClient);
          addLog('User confirmation sent, starting proof generation');
        }, 500);
        break;
      case 'proving':
        setStatusMessage('🔄 Generating zero-knowledge proof...');
        addLog('TEE is generating the attestation proof');
        break;
      case 'post_proving':
        if (circuitType === 'dsc') {
          setStatusMessage('📝 DSC verified, proceeding to registration...');
          addLog('DSC proof completed, chaining to registration proof');
        } else {
          setStatusMessage('✨ Finalizing registration...');
          addLog('Registration proof completed, updating state');
        }
        break;
      case 'completed':
        setStatusMessage('🎉 Registration completed successfully!');
        addLog('Document registered on-chain!', 'info');
        setRegistering(false);
        break;
      case 'error':
      case 'failure':
        setStatusMessage('❌ Registration failed');
        addLog('Registration failed - check logs for details', 'error');
        setRegistering(false);
        break;
    }
  }, [currentState, circuitType, registering, selfClient, setUserConfirmed, addLog]);

  const start = useCallback(
    (documentId: string, document: IDDocument) => {
      setRegistering(true);
      setLogs([]);
      setStatusMessage('🚀 Initializing registration...');
      addLog(`Starting registration for document ${documentId.slice(0, 8)}...`);
      const chosenCircuitType = document.mock || document.documentCategory === 'aadhaar' ? 'register' : 'dsc';
      addLog(`Using circuit type: ${chosenCircuitType}`);
      init(selfClient, chosenCircuitType);
      addLog('Proving state machine initialized');
    },
    [addLog, init, selfClient],
  );

  return {
    state: { registering, statusMessage, currentState, logs, showLogs },
    actions: {
      start,
      toggleLogs: () => setShowLogs(s => !s),
      reset: () => {
        setRegistering(false);
        setStatusMessage('');
        setLogs([]);
        setShowLogs(false);
      },
    },
  } as const;
}
