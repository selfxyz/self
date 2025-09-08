// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';

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
  IDENTITY_TREE_URL,
  IDENTITY_TREE_URL_ID_CARD,
  IDENTITY_TREE_URL_STAGING,
  IDENTITY_TREE_URL_STAGING_ID_CARD,
} from '@selfxyz/common/constants';
import { fetchOfacTrees } from '@selfxyz/common/utils/ofac';
import type { DeployedCircuits, OfacTree } from '@selfxyz/common/utils/types';

interface ProtocolState {
  passport: {
    commitment_tree: any;
    dsc_tree: any;
    csca_tree: string[][] | null;
    deployed_circuits: DeployedCircuits | null;
    circuits_dns_mapping: any;
    alternative_csca: Record<string, string>;
    ofac_trees: OfacTree | null;
    fetch_deployed_circuits: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_circuits_dns_mapping: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_csca_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_dsc_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_identity_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_alternative_csca: (environment: 'prod' | 'stg', ski: string) => Promise<void>;
    fetch_all: (environment: 'prod' | 'stg', ski: string) => Promise<void>;
    fetch_ofac_trees: (environment: 'prod' | 'stg') => Promise<void>;
  };
  id_card: {
    commitment_tree: any;
    dsc_tree: any;
    csca_tree: string[][] | null;
    deployed_circuits: DeployedCircuits | null;
    circuits_dns_mapping: any;
    alternative_csca: Record<string, string>;
    ofac_trees: OfacTree | null;
    fetch_deployed_circuits: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_circuits_dns_mapping: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_csca_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_dsc_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_identity_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_alternative_csca: (environment: 'prod' | 'stg', ski: string) => Promise<void>;
    fetch_all: (environment: 'prod' | 'stg', ski: string) => Promise<void>;
    fetch_ofac_trees: (environment: 'prod' | 'stg') => Promise<void>;
  };
}

export const useProtocolStore = create<ProtocolState>((set, get) => ({
  passport: {
    commitment_tree: null,
    dsc_tree: null,
    csca_tree: null,
    deployed_circuits: null,
    circuits_dns_mapping: null,
    alternative_csca: {},
    ofac_trees: null,
    fetch_all: async (environment: 'prod' | 'stg', ski: string) => {
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
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/ski-pems/${ski.toLowerCase()}`; // TODO: remove false once we have the endpoint in production
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
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ passport: { ...get().passport, deployed_circuits: data.data } });
      } catch (error) {
        console.error(`Failed fetching deployed circuits from ${url}:`, error);
      }
    },
    fetch_circuits_dns_mapping: async (environment: 'prod' | 'stg') => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/circuit-dns-mapping`;
      try {
        const response = await fetch(url);
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
      }
    },
    fetch_csca_tree: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? CSCA_TREE_URL : CSCA_TREE_URL_STAGING;
      try {
        const response = await fetch(url);
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
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ passport: { ...get().passport, dsc_tree: data.data } });
      } catch (error) {
        console.error(`Failed fetching DSC tree from ${url}:`, error);
        // Optionally handle error state
      }
    },
    fetch_identity_tree: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? IDENTITY_TREE_URL : IDENTITY_TREE_URL_STAGING;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ passport: { ...get().passport, commitment_tree: data.data } });
      } catch (error) {
        console.error(`Failed fetching identity tree from ${url}:`, error);
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
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ id_card: { ...get().id_card, deployed_circuits: data.data } });
      } catch (error) {
        console.error(`Failed fetching deployed circuits from ${url}:`, error);
        // Optionally handle error state
      }
    },
    fetch_circuits_dns_mapping: async (environment: 'prod' | 'stg') => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/circuit-dns-mapping`;
      try {
        const response = await fetch(url);
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
        // Optionally handle error state
      }
    },
    fetch_csca_tree: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? CSCA_TREE_URL_ID_CARD : CSCA_TREE_URL_STAGING_ID_CARD;
      try {
        const response = await fetch(url);
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
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ id_card: { ...get().id_card, dsc_tree: data.data } });
      } catch (error) {
        console.error(`Failed fetching DSC tree from ${url}:`, error);
        // Optionally handle error state
      }
    },
    fetch_identity_tree: async (environment: 'prod' | 'stg') => {
      const url = environment === 'prod' ? IDENTITY_TREE_URL_ID_CARD : IDENTITY_TREE_URL_STAGING_ID_CARD;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error fetching ${url}! status: ${response.status}`);
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ id_card: { ...get().id_card, commitment_tree: data.data } });
      } catch (error) {
        console.error(`Failed fetching identity tree from ${url}:`, error);
        // Optionally handle error state
      }
    },
    fetch_alternative_csca: async (environment: 'prod' | 'stg', ski: string) => {
      const url = `${environment === 'prod' ? API_URL : API_URL_STAGING}/ski-pems/${ski.toLowerCase()}`; // TODO: remove false once we have the endpoint in production
      try {
        const response = await fetch(url, {
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
}));
