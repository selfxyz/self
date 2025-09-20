// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ProvingStateType } from '@/utils/proving/provingMachine';

interface LoadingScreenText {
  actionText: string;
  estimatedTime: string;
}

export function getLoadingScreenText(
  state: ProvingStateType,
  signatureAlgorithm: string,
  curveOrExponent: string,
  type: 'dsc' | 'register' = 'register',
): LoadingScreenText {
  switch (state) {
    // Initial states
    case 'idle':
      return {
        actionText: 'Initializing...',
        estimatedTime: '1 - 5 SECONDS',
      };

    // Data preparation states
    case 'fetching_data':
      return {
        actionText: 'Reading current state of the registry',
        estimatedTime: '5 - 10 SECONDS',
      };
    case 'validating_document':
      return {
        actionText: 'Validating passport',
        estimatedTime: '5 - 10 SECONDS',
      };

    // Connection states
    case 'init_tee_connexion':
      return {
        actionText: 'Establishing secure connection',
        estimatedTime: '5 - 10 SECONDS',
      };
    case 'listening_for_status':
      return {
        actionText: 'Waiting for verification',
        estimatedTime: '10 - 30 SECONDS',
      };

    // Proving states
    case 'ready_to_prove':
      return {
        actionText: 'Ready to verify',
        estimatedTime: '1 - 3 SECONDS',
      };
    case 'proving':
      return {
        actionText: 'Generating ZK proof',
        estimatedTime:
          signatureAlgorithm && curveOrExponent
            ? getProvingTimeEstimate(signatureAlgorithm, curveOrExponent, type)
            : '30 - 90 SECONDS',
      };
    case 'post_proving':
      return {
        actionText: 'Finalizing verification',
        estimatedTime: '5 - 10 SECONDS',
      };

    // Success state
    case 'completed':
      return {
        actionText: 'Verified',
        estimatedTime: '1 - 3 SECONDS',
      };

    // Error states
    case 'error':
    case 'failure':
      return {
        actionText: 'Verification failed',
        estimatedTime: '1 - 3 SECONDS',
      };

    // Special case states
    case 'passport_not_supported':
      return {
        actionText: 'Unsupported passport',
        estimatedTime: '1 - 3 SECONDS',
      };
    case 'account_recovery_choice':
      return {
        actionText: 'Account recovery needed',
        estimatedTime: '1 - 3 SECONDS',
      };
    case 'passport_data_not_found':
      return {
        actionText: 'Passport data not found',
        estimatedTime: '1 - 3 SECONDS',
      };

    default:
      return {
        actionText: 'Verifying',
        estimatedTime: '10 - 30 SECONDS',
      };
  }
}

export function getProvingTimeEstimate(
  signatureAlgorithm: string,
  curveOrExponent: string,
  type: 'dsc' | 'register',
): string {
  if (!signatureAlgorithm || !curveOrExponent) return '30 - 90 SECONDS';

  const algorithm = signatureAlgorithm?.toLowerCase();
  const curve = curveOrExponent;

  // RSA algorithms
  if (algorithm?.includes('rsa')) {
    if (algorithm?.includes('pss')) {
      return type === 'dsc' ? '3 SECONDS' : '6 SECONDS';
    }
    return type === 'dsc' ? '2 SECONDS' : '4 SECONDS';
  }

  // ECDSA algorithms
  if (algorithm?.includes('ecdsa')) {
    // Check bit size from curve name
    if (curve?.includes('224') || curve?.includes('256')) {
      return type === 'dsc' ? '25 SECONDS' : '50 SECONDS';
    }
    if (curve?.includes('384')) {
      return type === 'dsc' ? '45 SECONDS' : '90 SECONDS';
    }
    if (curve?.includes('512') || curve?.includes('521')) {
      return type === 'dsc' ? '100 SECONDS' : '200 SECONDS';
    }
  }

  // Default case
  return '30 - 90 SECONDS';
}
