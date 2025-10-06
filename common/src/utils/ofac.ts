// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { TREE_URL, TREE_URL_STAGING } from '../constants/constants.js';
import type { Environment, OfacTree } from './types.js';

export type OfacVariant = 'passport' | 'id_card';

// Generic helper to fetch a single OFAC tree and validate the response shape.
const fetchTree = async (url: string): Promise<any> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error fetching ${url}! status: ${res.status}`);
  }
  const responseData = await res.json();

  // Handle wrapped responses with {status: 'success', data: ...} format
  if (responseData && typeof responseData === 'object' && 'status' in responseData) {
    if (responseData.status !== 'success' || !responseData.data) {
      throw new Error(
        `Failed to fetch tree from ${url}: ${responseData.message || 'Invalid response format'}`
      );
    }
    return responseData.data;
  }

  // Handle raw responses (direct tree data)
  return responseData;
};

// Main public helper that retrieves the three OFAC trees depending on the variant (passport vs id_card).
export const fetchOfacTrees = async (
  environment: Environment,
  variant: OfacVariant = 'passport'
): Promise<OfacTree> => {
  const baseUrl = environment === 'prod' ? TREE_URL : TREE_URL_STAGING;

  const ppNoNatUrl = `${baseUrl}/ofac/passport-no-nationality`;
  const nameDobUrl = `${baseUrl}/ofac/name-dob${variant === 'id_card' ? '-id' : ''}`;
  const nameYobUrl = `${baseUrl}/ofac/name-yob${variant === 'id_card' ? '-id' : ''}`;

  // For ID cards, we intentionally skip fetching the (large) passport-number-tree.
  if (variant === 'id_card') {
    const [nameDobData, nameYobData] = await Promise.all([
      fetchTree(nameDobUrl),
      fetchTree(nameYobUrl),
    ]);

    return {
      passportNoAndNationality: null,
      nameAndDob: nameDobData,
      nameAndYob: nameYobData,
    };
  }

  // Passport variant → fetch all three.
  const [ppNoNatData, nameDobData, nameYobData] = await Promise.all([
    fetchTree(ppNoNatUrl),
    fetchTree(nameDobUrl),
    fetchTree(nameYobUrl),
  ]);

  return {
    passportNoAndNationality: ppNoNatData,
    nameAndDob: nameDobData,
    nameAndYob: nameYobData,
  };
};
