// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type ApiResponse<T = unknown> = {
  success: boolean;
  status: number;
  error?: string;
  data?: T;
};

export const POINTS_API_BASE_URL =
  'https://points-backend-1025466915061.us-central1.run.app';

/**
 * Makes a POST request to the points API with consistent error handling.
 */
export const makeApiRequest = async (
  endpoint: string,
  body: Record<string, unknown>,
  errorMessages?: Record<string, string>,
): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${POINTS_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 200) {
      return { success: true, status: 200 };
    }

    let errorMessage = 'An unexpected error occurred. Please try again.';
    try {
      const data = await response.json();
      if (errorMessages && data.status) {
        errorMessage =
          errorMessages[data.status] || data.message || errorMessage;
      } else if (data.message) {
        errorMessage = data.message;
      }
    } catch {
      // If parsing fails, keep the generic error
    }

    return { success: false, status: response.status, error: errorMessage };
  } catch (error) {
    console.error(`Error making API request to ${endpoint}:`, error);
    return {
      success: false,
      status: 500,
      error: 'Network error. Please check your connection and try again.',
    };
  }
};
