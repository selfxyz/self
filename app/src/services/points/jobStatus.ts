// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { POINTS_API_BASE_URL } from '@/services/points/constants';

export type JobStatusResponse = {
  job_id: string;
  status: 'complete' | 'failed';
};

export async function checkEventProcessingStatus(
  jobId: string,
): Promise<'pending' | 'completed' | 'failed' | null> {
  try {
    const response = await fetch(`${POINTS_API_BASE_URL}/job/${jobId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 102 means pending
    if (response.status === 102) {
      return 'pending';
    }

    // 404 means job not found - stop polling as it will never be found
    if (response.status === 404) {
      return 'failed';
    }

    // 200 means completed or failed - check the response body
    if (response.status === 200) {
      const data: JobStatusResponse = await response.json();
      if (data.status === 'complete') {
        return 'completed';
      }
      if (data.status === 'failed') {
        return 'failed';
      }
    }

    return null;
  } catch (error) {
    console.error(`Error checking job ${jobId} status:`, error);
    return null;
  }
}
