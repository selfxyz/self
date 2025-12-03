// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AxiosError } from 'axios';
import axios from 'axios';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';

import { unsafe_getPointsPrivateKey } from '@/providers/authProvider';
import { POINTS_API_BASE_URL } from '@/services/points/constants';
import { getPointsAddress } from '@/services/points/utils';

export type ApiResponse<T = unknown> = {
  success: boolean;
  status: number;
  error?: string;
  data?: T;
};

export interface SignatureData {
  signature: string; // base64-encoded signature
  parity: number; // yParity value (0 or 1)
}

/**
 * Successful HTTP status codes accepted by the points API
 */
const SUCCESSFUL_STATUS_CODES = [200, 202] as const;

/**
 * Checks if a status code is considered successful
 */
export const isSuccessfulStatus = (status: number): boolean =>
  SUCCESSFUL_STATUS_CODES.includes(
    status as (typeof SUCCESSFUL_STATUS_CODES)[number],
  );

/**
 * Generates a signature for API authentication.
 * Signs the lowercase wallet address using the user's private key.
 *
 * @param address - The wallet address to sign (will be lowercased)
 * @returns Signature data including base64 signature and parity
 * @throws Error if private key cannot be retrieved or signing fails
 */
const generateSignature = async (address: string): Promise<SignatureData> => {
  try {
    const signingAddress = address.toLowerCase();

    // Select appropriate private key based on which derived address is being signed:
    // - If signing the points address (derived at index 1), use the points private key
    // - Otherwise, default to the primary account private key (index 0)
    let privateKey: string | null = null;
    try {
      const pointsAddr = (await getPointsAddress()).toLowerCase();
      if (signingAddress === pointsAddr) {
        privateKey = await unsafe_getPointsPrivateKey();
      }
    } catch {
      // If fetching the points address fails for any reason, fall back to primary key
    }

    if (!privateKey) {
      throw new Error('Failed to retrieve private key for signing');
    }

    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);

    // Sign the lowercase address
    const signature = await wallet.signMessage(signingAddress);

    // Parse signature to extract parity
    const sig = ethers.Signature.from(signature);

    // Convert signature to base64
    const sigBytes = ethers.getBytes(signature);
    const signatureBase64 = Buffer.from(sigBytes).toString('base64');

    return {
      signature: signatureBase64,
      parity: sig.yParity,
    };
  } catch (error) {
    console.error('Error generating signature:', error);
    throw new Error(
      `Failed to generate signature: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * Makes a POST request to the points API with consistent error handling.
 * Automatically includes signature and parity for authentication by detecting
 * the signing address from the request body (uses 'referee' or 'address' field).
 *
 * @param endpoint - The API endpoint path
 * @param body - The request body data
 * @param errorMessages - Optional custom error messages for specific error codes
 */
export const makeApiRequest = async <T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
  errorMessages?: Record<string, string>,
): Promise<ApiResponse<T>> => {
  try {
    // Auto-detect signing address from body (referee for referrals, address for other endpoints)
    const signingAddress = (body.referee as string) || (body.address as string);

    // Lowercase address fields and prepare request body
    let requestBody = { ...body };
    if (body.referee) {
      requestBody.referee = (body.referee as string).toLowerCase();
    }
    if (body.referrer) {
      requestBody.referrer = (body.referrer as string).toLowerCase();
    }
    if (body.address) {
      requestBody.address = (body.address as string).toLowerCase();
    }

    // Generate signature if a signing address is detected
    if (signingAddress) {
      const signatureData = await generateSignature(signingAddress);
      requestBody = {
        ...requestBody,
        signature: signatureData.signature,
        parity: signatureData.parity,
      };
    }

    const response = await axios.post(
      `${POINTS_API_BASE_URL}${endpoint}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Don't throw on any status
      },
    );

    // uncomment to see api call
    // console.error('url', `${POINTS_API_BASE_URL}${endpoint}`);
    // console.error('req body', JSON.stringify(requestBody, null, 2));
    // console.error('response', JSON.stringify(response.data, null, 2));
    // console.error('response.status', response.status);

    if (isSuccessfulStatus(response.status)) {
      return { success: true, status: response.status, data: response.data };
    }

    let errorMessage = 'An unexpected error occurred. Please try again.';
    if (errorMessages && response.data?.status) {
      errorMessage =
        errorMessages[response.data.status] ||
        response.data.message ||
        errorMessage;
    } else if (response.data?.message) {
      errorMessage = response.data.message;
    }

    return { success: false, status: response.status, error: errorMessage };
  } catch (error) {
    console.error(`Error making API request to ${endpoint}:`, error);
    const axiosError = error as AxiosError;
    return {
      success: false,
      status: axiosError.response?.status || 500,
      error:
        axiosError.message ||
        'Network error. Please check your connection and try again.',
    };
  }
};
