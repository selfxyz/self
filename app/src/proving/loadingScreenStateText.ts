// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type {
  provingMachineCircuitType,
  ProvingStateType,
} from '@selfxyz/mobile-sdk-alpha';

interface LoadingScreenText {
  actionText: string;
  actionSubText: string;
  estimatedTime: string;
  statusBarProgress: number;
}

export function getLoadingScreenText(
  state: ProvingStateType,
  signatureAlgorithm: string,
  curveOrExponent: string,
  type: provingMachineCircuitType,
): LoadingScreenText {
  // Helper function to calculate progress with type offset
  const getStatusBarProgress = (baseProgress: number): number => {
    return baseProgress + (type === 'register' ? 3 : 0);
  };

  switch (state) {
    // Initial states
    case 'idle':
      return {
        actionText: 'Initializing',
        actionSubText: 'Retrieving ID data from the keychain',
        estimatedTime: '3 - 15 SECONDS',
        statusBarProgress: getStatusBarProgress(0),
      };

    case 'parsing_id_document':
      return {
        actionText: 'Initializing',
        actionSubText: 'Parsing ID data',
        estimatedTime: '3 - 15 SECONDS',
        statusBarProgress: getStatusBarProgress(0),
      };

    // Data preparation states
    case 'fetching_data':
      return {
        actionText: 'Reading registry',
        actionSubText: 'Reading current state of the registry',
        estimatedTime: '2 - 5 SECONDS',
        statusBarProgress: getStatusBarProgress(1),
      };

    case 'validating_document':
      return {
        actionText: 'Validating ID',
        actionSubText: 'Validating ID data locally',
        estimatedTime: '2 - 5 SECONDS',
        statusBarProgress: getStatusBarProgress(1),
      };

    // Connection states
    case 'init_tee_connexion':
      return {
        actionText: 'Securing connection',
        actionSubText: 'Establishing secure connection to the registry',
        estimatedTime: '2 - 5 SECONDS',
        statusBarProgress: getStatusBarProgress(2),
      };
    case 'listening_for_status':
      return {
        actionText: 'Securing connection',
        actionSubText: 'Establishing secure connection to the registry',
        estimatedTime: '2 - 5 SECONDS',
        statusBarProgress: getStatusBarProgress(2),
      };
    // Proving states
    case 'ready_to_prove':
      return {
        actionText: 'Securing connection',
        actionSubText: 'Establishing secure connection to the registry',
        estimatedTime: '2 - 5 SECONDS',
        statusBarProgress: getStatusBarProgress(2),
      };
    case 'proving':
      return {
        actionText: 'Proving',
        actionSubText: 'Generating the ZK proof',
        statusBarProgress: getStatusBarProgress(2),
        estimatedTime:
          signatureAlgorithm && curveOrExponent
            ? getProvingTimeEstimate(signatureAlgorithm, curveOrExponent, type)
            : '30 - 90 SECONDS',
      };
    case 'post_proving':
      return {
        actionText: 'Verifying',
        actionSubText: 'Waiting for verification of the ZK proof',
        statusBarProgress: getStatusBarProgress(2),
        estimatedTime: '1 - 2 SECONDS',
      };

    // Success state
    case 'completed':
      return {
        actionText: 'Verified',
        actionSubText: 'Verification completed',
        statusBarProgress: getStatusBarProgress(3),
        estimatedTime: '0 - 1 SECONDS',
      };

    // Error states
    case 'error':
    case 'failure':
      return {
        actionText: 'Verification failed',
        actionSubText: 'Verification failed',
        statusBarProgress: getStatusBarProgress(0),
        estimatedTime: '0 - 1 SECONDS',
      };

    // Special case states
    case 'passport_not_supported':
      return {
        actionText: 'Unsupported passport',
        actionSubText: 'Unsupported passport',
        estimatedTime: '1 - 3 SECONDS',
        statusBarProgress: getStatusBarProgress(0),
      };
    case 'account_recovery_choice':
      return {
        actionText: 'Account recovery needed',
        actionSubText: 'Account recovery needed',
        statusBarProgress: getStatusBarProgress(0),
        estimatedTime: '1 - 3 SECONDS',
      };
    case 'passport_data_not_found':
      return {
        actionText: 'Passport data not found',
        actionSubText: 'Passport data not found',
        statusBarProgress: getStatusBarProgress(0),
        estimatedTime: '1 - 3 SECONDS',
      };

    default:
      return {
        actionText: '',
        actionSubText: '',
        statusBarProgress: getStatusBarProgress(0),
        estimatedTime: 'SECONDS',
      };
  }
}

export function getProvingTimeEstimate(
  signatureAlgorithm: string,
  curveOrExponent: string,
  type: provingMachineCircuitType,
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
