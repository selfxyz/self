// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { notificationApiStagingUrl, notificationApiUrl } from '@/consts/links';

export interface DeviceTokenRegistration {
  session_id: string;
  device_token: string;
  platform: 'ios' | 'android' | 'web';
}

export interface RemoteMessage {
  messageId?: string;
  data?: { [key: string]: string | object };
  notification?: {
    title?: string;
    body?: string;
  };
  [key: string]: unknown;
}

export const API_URL = notificationApiUrl;

export const API_URL_STAGING = notificationApiStagingUrl;
export const getStateMessage = (state: string): string => {
  switch (state) {
    case 'idle':
      return 'Getting ready...';
    case 'fetching_data':
      return 'Fetching data...';
    case 'validating_document':
      return 'Validating document...';
    case 'init_tee_connexion':
      return 'Preparing secure environment...';
    case 'ready_to_prove':
      return 'Ready to prove...';
    case 'proving':
      return 'Generating proof...';
    case 'post_proving':
      return 'Finalizing...';
    case 'completed':
      return 'Verification completed!';
    case 'error':
      return 'Error occurred';
    case 'passport_not_supported':
      return 'Passport not supported';
    case 'account_recovery_choice':
      return 'Account recovery needed';
    case 'passport_data_not_found':
      return 'Passport data not found';
    case 'failure':
      return 'Verification failed';
    default:
      return 'Processing...';
  }
};
