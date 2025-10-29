// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';

import type { DeployedCircuits, DocumentCategory, Environment, OfacTree } from '@selfxyz/common';
import {
  API_URL,
  API_URL_STAGING,
  CSCA_TREE_URL,
  CSCA_TREE_URL_ID_CARD,
  CSCA_TREE_URL_STAGING,
  CSCA_TREE_URL_STAGING_ID_CARD,
  DSC_TREE_URL,
  DSC_TREE_URL_ID_CARD,
  DSC_TREE_URL_STAGING,
  DSC_TREE_URL_STAGING_ID_CARD,
  fetchOfacTrees,
  IDENTITY_TREE_URL,
  IDENTITY_TREE_URL_ID_CARD,
  IDENTITY_TREE_URL_STAGING,
  IDENTITY_TREE_URL_STAGING_ID_CARD,
  TREE_URL,
  TREE_URL_STAGING,
} from '@selfxyz/common';

import type { SelfClient } from '../types/public';

/**
 * Fetch helper that races the request against a timeout to prevent hangs when
 * infrastructure endpoints are degraded. The returned promise rejects with an
 * `AbortError` when the timer elapses so callers can emit structured retry
 * events.
 *
 * @param url - URL to fetch.
 * @param options - Fetch options forwarded to `fetch`.
 * @param timeoutMs - Timeout in milliseconds (default: 30000).
 */
async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * In-memory cache of trees, keys, and circuit metadata required for proving
 * across supported document categories. Each nested object exposes `fetch_*`
 * helpers that load data from the configured environment. All fetchers are
 * resilient to network errors and reset state to `null` when the response is
 * unusable so callers can decide whether to retry or surface an error.
 */
export interface ProtocolState {
  passport: {
    commitment_tree: any;
    dsc_tree: any;
    csca_tree: string[][] | null;
    deployed_circuits: DeployedCircuits | null;
    circuits_dns_mapping: any;
    alternative_csca: Record<string, string>;
    ofac_trees: OfacTree | null;
    fetch_deployed_circuits: (environment: Environment) => Promise<void>;
    fetch_circuits_dns_mapping: (environment: Environment) => Promise<void>;
    fetch_csca_tree: (environment: Environment) => Promise<void>;
    fetch_dsc_tree: (environment: Environment) => Promise<void>;
    fetch_identity_tree: (environment: Environment) => Promise<void>;
    fetch_alternative_csca: (environment: Environment, ski: string) => Promise<void>;
    fetch_all: (environment: Environment, ski: string) => Promise<void>;
    fetch_ofac_trees: (environment: Environment) => Promise<void>;
  };
  id_card: {
    commitment_tree: any;
    dsc_tree: any;
    csca_tree: string[][] | null;
    deployed_circuits: DeployedCircuits | null;
    circuits_dns_mapping: any;
    alternative_csca: Record<string, string>;
    ofac_trees: OfacTree | null;
    fetch_deployed_circuits: (environment: Environment) => Promise<void>;
    fetch_circuits_dns_mapping: (environment: Environment) => Promise<void>;
    fetch_csca_tree: (environment: Environment) => Promise<void>;
    fetch_dsc_tree: (environment: Environment) => Promise<void>;
    fetch_identity_tree: (environment: Environment) => Promise<void>;
    fetch_alternative_csca: (environment: Environment, ski: string) => Promise<void>;
    fetch_all: (environment: Environment, ski: string) => Promise<void>;
    fetch_ofac_trees: (environment: Environment) => Promise<void>;
  };
  aadhaar: {
    commitment_tree: any;
    public_keys: string[] | null;
    deployed_circuits: DeployedCircuits | null;
    circuits_dns_mapping: any;
    ofac_trees: OfacTree | null;
    fetch_deployed_circuits: (environment: Environment) => Promise<void>;
    fetch_circuits_dns_mapping: (environment: Environment) => Promise<void>;
    fetch_public_keys: (environment: Environment) => Promise<void>;
    fetch_identity_tree: (environment: Environment) => Promise<void>;
    fetch_all: (environment: Environment) => Promise<void>;
    fetch_ofac_trees: (environment: Environment) => Promise<void>;
  };
}

/**
 * Convenience helper that pulls every relevant tree for a document category in
 * parallel. Errors bubble to the caller so higher-level flows can surface
 * progress or failure UI.
 */
export async function fetchAllTreesAndCircuits(
  selfClient: SelfClient,
  docCategory: DocumentCategory,
  environment: Environment,
  authorityKeyIdentifier: string,
) {
  await selfClient.getProtocolState()[docCategory].fetch_all(environment, authorityKeyIdentifier);
}

/**
 * Returns the cached alternative CSCA keys for the requested document type.
 * Aadhaar does not expose alternative CSCA, so the method returns the raw
 * public key list instead.
 */
export function getAltCSCAPublicKeys(selfClient: SelfClient, docCategory: DocumentCategory) {
  if (docCategory === 'aadhaar') {
    return selfClient.getProtocolState()[docCategory].public_keys;
  }

  return selfClient.getProtocolState()[docCategory].alternative_csca;
}

/**
 * Retrieves the latest commitment tree snapshot for the provided document
 * category. Returns `null` when the data has not been fetched yet or when the
 * previous fetch failed.
 */
export function getCommitmentTree(selfClient: SelfClient, documentCategory: DocumentCategory) {
  const protocolStore = selfClient.getProtocolState();

  return protocolStore[documentCategory].commitment_tree;
}

/**
 * Protocol store hook exposed through {@link SelfClient}. The store manages
 * asynchronous fetchers and ensures tree/state mutations remain atomic even
 * when multiple requests are in flight.
 */
export const useProtocolStore = create<ProtocolState>((set, get) => ({
  passport: {
    commitment_tree: null,
    dsc_tree: null,
    csca_tree: null,
    deployed_circuits: null,
    circuits_dns_mapping: null,
    alternative_csca: {},
    ofac_trees: null,
    fetch_all: async (environment: Environment, ski: string) => {
      await Promise.all([
        get().passport.fetch_deployed_circuits(environment),
        get().passport.fetch_circuits_dns_mapping(environment),
        get().passport.fetch_csca_tree(environment),
        get().passport.fetch_dsc_tree(environment),
        get().passport.fetch_identity_tree(environment),
        get().passport.fetch_ofac_trees(environment),
        get().passport.fetch_alternative_csca(environment, ski),
      ]);
    },
    fetch_alternative_csca: async (environment: 'prod' | 'stg', ski: string) => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/ski-pems/${ski.toLowerCase()}`;
      try {
        const response = await fetch(url, {
          method: 'GET',
        });
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ passport: { ...get().passport, alternative_csca: data.data } });
      } catch (error) {
        console.error(`Failed fetching alternative CSCA from ${url}:`, error);
        set({ passport: { ...get().passport, alternative_csca: {} } });
      }
    },
    fetch_deployed_circuits: async (environment: 'prod' | 'stg') => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/deployed-circuits`;
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ passport: { ...get().passport, deployed_circuits: data.data } });
      } catch (error) {
        console.error(`Failed fetching deployed circuits from ${url}:`, error);
        set({ passport: { ...get().passport, deployed_circuits: null } });
      }
    },
    fetch_circuits_dns_mapping: async (environment: 'prod' | 'stg') => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/circuit-dns-mapping-gcp`;
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({
          passport: { ...get().passport, circuits_dns_mapping: data.data },
        });
      } catch (error) {
        console.error(`Failed fetching circuit DNS mapping from ${url}:`, error);
        set({ passport: { ...get().passport, circuits_dns_mapping: null } });
      }
    },
    fetch_csca_tree: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? CSCA_TREE_URL : CSCA_TREE_URL_STAGING;
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const rawData = JSON.parse(responseText);

        let treeData: any;
        if (rawData && rawData.data) {
          treeData = typeof rawData.data === 'string' ? JSON.parse(rawData.data) : rawData.data;
        } else {
          treeData = rawData; // Assume rawData is the tree if no .data field
        }
        set({ passport: { ...get().passport, csca_tree: treeData } });
      } catch (error) {
        console.error(`Failed fetching CSCA tree from ${url}:`, error);
        set({ passport: { ...get().passport, csca_tree: null } }); // Reset on error
      }
    },
    fetch_dsc_tree: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? DSC_TREE_URL : DSC_TREE_URL_STAGING;
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ passport: { ...get().passport, dsc_tree: data.data } });
      } catch (error) {
        console.error(`Failed fetching DSC tree from ${url}:`, error);
        set({ passport: { ...get().passport, dsc_tree: null } });
      }
    },
    fetch_identity_tree: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? IDENTITY_TREE_URL : IDENTITY_TREE_URL_STAGING;
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ passport: { ...get().passport, commitment_tree: data.data } });
      } catch (error) {
        console.error(`Failed fetching identity tree from ${url}:`, error);
        set({ passport: { ...get().passport, commitment_tree: null } });
      }
    },
    fetch_ofac_trees: async (environment: 'prod' | 'stg') => {
      try {
        const trees = await fetchOfacTrees(environment, 'passport');
        set({ passport: { ...get().passport, ofac_trees: trees } });
      } catch (error) {
        console.error('Failed fetching OFAC trees:', error);
        set({ passport: { ...get().passport, ofac_trees: null } });
      }
    },
  },
  id_card: {
    commitment_tree: null,
    dsc_tree: null,
    csca_tree: null,
    deployed_circuits: null,
    circuits_dns_mapping: null,
    alternative_csca: {},
    ofac_trees: null,
    fetch_all: async (environment: 'prod' | 'stg', ski: string) => {
      await Promise.all([
        get().id_card.fetch_deployed_circuits(environment),
        get().id_card.fetch_circuits_dns_mapping(environment),
        get().id_card.fetch_csca_tree(environment),
        get().id_card.fetch_dsc_tree(environment),
        get().id_card.fetch_identity_tree(environment),
        get().id_card.fetch_ofac_trees(environment),
        get().id_card.fetch_alternative_csca(environment, ski),
      ]);
    },
    fetch_deployed_circuits: async (environment: 'prod' | 'stg') => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/deployed-circuits`;
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ id_card: { ...get().id_card, deployed_circuits: data.data } });
      } catch (error) {
        console.error(`Failed fetching deployed circuits from ${url}:`, error);
        set({ id_card: { ...get().id_card, deployed_circuits: null } });
      }
    },
    fetch_circuits_dns_mapping: async (environment: 'prod' | 'stg') => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/circuit-dns-mapping-gcp`;
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({
          id_card: { ...get().id_card, circuits_dns_mapping: data.data },
        });
      } catch (error) {
        console.error(`Failed fetching circuit DNS mapping from ${url}:`, error);
        set({ id_card: { ...get().id_card, circuits_dns_mapping: null } });
      }
    },
    fetch_csca_tree: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? CSCA_TREE_URL_ID_CARD : CSCA_TREE_URL_STAGING_ID_CARD;
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const rawData = JSON.parse(responseText);

        let treeData: any;
        if (rawData && rawData.data) {
          treeData = typeof rawData.data === 'string' ? JSON.parse(rawData.data) : rawData.data;
        } else {
          treeData = rawData; // Assume rawData is the tree if no .data field
        }
        set({ id_card: { ...get().id_card, csca_tree: treeData } });
      } catch (error) {
        console.error(`Failed fetching CSCA tree from ${url}:`, error);
        set({ id_card: { ...get().id_card, csca_tree: null } }); // Reset on error
      }
    },
    fetch_dsc_tree: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? DSC_TREE_URL_ID_CARD : DSC_TREE_URL_STAGING_ID_CARD;
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ id_card: { ...get().id_card, dsc_tree: data.data } });
      } catch (error) {
        console.error(`Failed fetching DSC tree from ${url}:`, error);
        set({ id_card: { ...get().id_card, dsc_tree: null } });
      }
    },
    fetch_identity_tree: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? IDENTITY_TREE_URL_ID_CARD : IDENTITY_TREE_URL_STAGING_ID_CARD;
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ id_card: { ...get().id_card, commitment_tree: data.data } });
      } catch (error) {
        console.error(`Failed fetching identity tree from ${url}:`, error);
        set({ id_card: { ...get().id_card, commitment_tree: null } });
      }
    },
    fetch_alternative_csca: async (environment: 'prod' | 'stg', ski: string) => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/ski-pems/${ski.toLowerCase()}`;
      try {
        const response = await fetchWithTimeout(url, {
          method: 'GET',
        });
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ id_card: { ...get().id_card, alternative_csca: data.data } });
      } catch (error) {
        console.error(`Failed fetching alternative CSCA from ${url}:`, error);
        set({ id_card: { ...get().id_card, alternative_csca: {} } });
      }
    },
    fetch_ofac_trees: async (environment: 'prod' | 'stg') => {
      try {
        const trees = await fetchOfacTrees(environment, 'id_card');
        set({ id_card: { ...get().id_card, ofac_trees: trees } });
      } catch (error) {
        console.error('Failed fetching OFAC trees:', error);
        set({ id_card: { ...get().id_card, ofac_trees: null } });
      }
    },
  },
  aadhaar: {
    commitment_tree: null,
    public_keys: null,
    deployed_circuits: null,
    circuits_dns_mapping: null,
    ofac_trees: null,
    fetch_all: async (environment: 'prod' | 'stg') => {
      try {
        await Promise.all([
          get().aadhaar.fetch_deployed_circuits(environment),
          get().aadhaar.fetch_circuits_dns_mapping(environment),
          get().aadhaar.fetch_public_keys(environment),
          get().aadhaar.fetch_identity_tree(environment),
          get().aadhaar.fetch_ofac_trees(environment),
        ]);
      } catch (error) {
        console.error(`Failed fetching Aadhaar data for ${environment}:`, error);
        throw error; // Re-throw to let proving machine handle it
      }
    },
    fetch_deployed_circuits: async (environment: 'prod' | 'stg') => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/deployed-circuits`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
      }
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      set({ aadhaar: { ...get().aadhaar, deployed_circuits: data.data } });
    },
    fetch_circuits_dns_mapping: async (environment: 'prod' | 'stg') => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/circuit-dns-mapping-gcp`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
      }
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      set({
        aadhaar: { ...get().aadhaar, circuits_dns_mapping: data.data },
      });
    },
    fetch_public_keys: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? `${TREE_URL}/aadhaar-pubkeys` : `${TREE_URL_STAGING}/aadhaar-pubkeys`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
      }
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      set({ aadhaar: { ...get().aadhaar, public_keys: data.data } });
    },
    fetch_identity_tree: async (environment: 'prod' | 'stg') => {
      const url = `${environment === 'prod' ? TREE_URL : TREE_URL_STAGING}/identity-aadhaar`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ aadhaar: { ...get().aadhaar, commitment_tree: data.data } });
      } catch (error) {
        console.error(`Failed fetching Aadhaar identity tree from ${url}:`, error);
      }
    },
    fetch_ofac_trees: async (environment: 'prod' | 'stg') => {
      const baseUrl = environment === 'prod' ? TREE_URL : TREE_URL_STAGING;
      const nameDobUrl = `${baseUrl}/ofac/name-dob-aadhaar`;
      const nameYobUrl = `${baseUrl}/ofac/name-yob-aadhaar`;

      try {
        const fetchTree = async (url: string): Promise<any> => {
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`HTTP error fetching ${url}! status: ${res.status}`);
          }
          const responseData = await res.json();

          if (responseData && typeof responseData === 'object' && 'status' in responseData) {
            if (responseData.status !== 'success' || !responseData.data) {
              throw new Error(`Failed to fetch tree from ${url}: ${responseData.message || 'Invalid response format'}`);
            }
            return responseData.data;
          }

          return responseData;
        };

        const [nameDobData, nameYobData] = await Promise.all([fetchTree(nameDobUrl), fetchTree(nameYobUrl)]);

        set({
          aadhaar: {
            ...get().aadhaar,
            ofac_trees: {
              passportNoAndNationality: null,
              nameAndDob: nameDobData,
              nameAndYob: nameYobData,
            },
          },
        });
      } catch (error) {
        console.error('Failed fetching Aadhaar OFAC trees:', error);
        set({ aadhaar: { ...get().aadhaar, ofac_trees: null } });
      }
    },
  },
}));
