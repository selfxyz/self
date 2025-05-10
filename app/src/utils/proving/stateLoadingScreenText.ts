import { ProvingStateType } from './provingMachine';

interface LoadingScreenText {
  actionText: string;
  estimatedTime: string;
}

export function getLoadingScreenText(
  state: ProvingStateType,
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
        actionText: 'Fetching passport data',
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
        actionText: 'Generating proof',
        estimatedTime: '10 - 30 SECONDS',
      };
    case 'post_proving':
      return {
        actionText: 'Finalizing verification',
        estimatedTime: '5 - 10 SECONDS',
      };

    // Success state
    case 'completed':
      return {
        actionText: 'Verification complete',
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
