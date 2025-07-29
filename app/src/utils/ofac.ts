// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { TREE_URL, TREE_URL_STAGING } from '@selfxyz/common';

export type OfacVariant = 'passport' | 'id_card';

export interface OfacTrees {
  passportNoAndNationality: any;
  nameAndDob: any;
  nameAndYob: any;
}

// Generic helper to fetch a single OFAC tree and validate the response shape.
const fetchTree = async (url: string): Promise<any> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error fetching ${url}! status: ${res.status}`);
  }
  const responseData = await res.json();
  if (responseData.status !== 'success' || !responseData.data) {
    throw new Error(
      `Failed to fetch tree from ${url}: ${
        responseData.message || 'Invalid response format'
      }`,
    );
  }
  return responseData.data;
};

// Main public helper that retrieves the three OFAC trees depending on the variant (passport vs id_card).
export const fetchOfacTrees = async (
  environment: 'prod' | 'stg',
  variant: OfacVariant = 'passport',
): Promise<OfacTrees> => {
  const baseUrl = environment === 'prod' ? TREE_URL : TREE_URL_STAGING;

  const ppNoNatUrl = `${baseUrl}/ofac/passport-no-nationality`;
  const nameDobUrl = `${baseUrl}/ofac/name-dob${
    variant === 'id_card' ? '-id' : ''
  }`;
  const nameYobUrl = `${baseUrl}/ofac/name-yob${
    variant === 'id_card' ? '-id' : ''
  }`;

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
