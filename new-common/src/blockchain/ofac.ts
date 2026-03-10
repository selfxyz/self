import { TREE_URL, TREE_URL_STAGING } from '../foundation/constants/network.js';
import type { Environment, OfacTree } from '../foundation/types/environment.js';

export type OfacVariant = 'passport' | 'id_card';

const fetchTree = async (url: string): Promise<any> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error fetching ${url}! status: ${res.status}`);
  }
  const responseData = await res.json();

  if (responseData && typeof responseData === 'object' && 'status' in responseData) {
    if (responseData.status !== 'success' || !responseData.data) {
      throw new Error(
        `Failed to fetch tree from ${url}: ${responseData.message || 'Invalid response format'}`,
      );
    }
    return responseData.data;
  }

  return responseData;
};

export const fetchOfacTrees = async (
  environment: Environment,
  variant: OfacVariant = 'passport',
): Promise<OfacTree> => {
  const baseUrl = environment === 'prod' ? TREE_URL : TREE_URL_STAGING;

  const ppNoNatUrl = `${baseUrl}/ofac/passport-no-nationality`;
  const nameDobUrl = `${baseUrl}/ofac/name-dob${variant === 'id_card' ? '-id' : ''}`;
  const nameYobUrl = `${baseUrl}/ofac/name-yob${variant === 'id_card' ? '-id' : ''}`;

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
