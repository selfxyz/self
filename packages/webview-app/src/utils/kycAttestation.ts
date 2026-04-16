// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { io } from 'socket.io-client';

import type { KycProviderAttestation } from '../types/kycProvider';

const KYC_TEE_URL = import.meta.env.VITE_KYC_TEE_URL ?? 'https://kyc.self.xyz';

const ATTESTATION_TIMEOUT_MS = 120_000; // 2 minutes

export interface AttestationResult {
  status: 'success' | 'failed' | 'timeout';
  attestation?: KycProviderAttestation;
  error?: string;
}

/**
 * Subscribe to Socket.IO on the TEE and wait for the signed KYC attestation.
 * Returns the attestation (signature + applicantInfo + pubkey) or an error.
 *
 * After receiving data, emits `ack_success` to trigger session deletion on the TEE.
 */
export function waitForKycAttestation(sessionId: string, signal?: AbortSignal): Promise<AttestationResult> {
  return new Promise(resolve => {
    const socket = io(KYC_TEE_URL, {
      transports: ['websocket', 'polling'],
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      resolve({ status: 'timeout', error: 'Timed out waiting for verification result' });
    }, ATTESTATION_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.disconnect();
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup();
        resolve({ status: 'failed', error: 'Aborted' });
      });
    }

    socket.on('connect', () => {
      socket.emit('subscribe', sessionId);
    });

    socket.on('success', (data: { signature: string; applicantInfo: string; pubkey: [string, string] }) => {
      socket.emit('ack_success', sessionId);
      cleanup();
      resolve({
        status: 'success',
        attestation: {
          serializedApplicantInfo: data.applicantInfo,
          signature: data.signature,
          pubkey: data.pubkey,
        },
      });
    });

    socket.on('verification_failed', (reason: string) => {
      cleanup();
      resolve({ status: 'failed', error: reason });
    });

    socket.on('error', (err: string) => {
      cleanup();
      resolve({ status: 'failed', error: err });
    });

    socket.on('connect_error', (err: Error) => {
      cleanup();
      resolve({ status: 'failed', error: `Connection failed: ${err.message}` });
    });
  });
}
