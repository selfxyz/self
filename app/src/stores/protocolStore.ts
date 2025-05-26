import { create } from 'zustand';

import {
  API_URL,
  API_URL_STAGING,
  CSCA_TREE_URL,
  CSCA_TREE_URL_STAGING,
  DSC_TREE_URL,
  DSC_TREE_URL_STAGING,
  IDENTITY_TREE_URL,
  IDENTITY_TREE_URL_STAGING,
} from '../../../common/src/constants/constants';

interface ProtocolState {
  passport: {
    commitment_tree: any;
    dsc_tree: any;
    csca_tree: string[][] | null;
    deployed_circuits: any;
    circuits_dns_mapping: any;
    alternative_csca: Record<string, string>;
    fetch_deployed_circuits: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_circuits_dns_mapping: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_csca_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_dsc_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_identity_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_alternative_csca: (
      environment: 'prod' | 'stg',
      ski: string,
    ) => Promise<void>;
    fetch_all: (environment: 'prod' | 'stg', ski: string) => Promise<void>;
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
    fetch_all: async (environment: 'prod' | 'stg', ski: string) => {
      await Promise.all([
        get().passport.fetch_deployed_circuits(environment),
        get().passport.fetch_circuits_dns_mapping(environment),
        get().passport.fetch_csca_tree(environment),
        get().passport.fetch_dsc_tree(environment),
        get().passport.fetch_identity_tree(environment),
        get().passport.fetch_alternative_csca(environment, ski),
      ]);
    },
    fetch_alternative_csca: async (
      environment: 'prod' | 'stg',
      ski: string,
    ) => {
      const url = `${environment === 'prod' && false ? API_URL : API_URL_STAGING}/ski-pems/${ski.toLowerCase()}`; // TODO: remove false once we have the endpoint in production
      try {
        const response = await fetch(url, {
          method: 'GET',
        });
        if (!response.ok) {
          throw new Error(
            `HTTP error fetching ${url}! status: ${response.status}`,
          );
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
          throw new Error(
            `HTTP error fetching ${url}! status: ${response.status}`,
          );
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
          throw new Error(
            `HTTP error fetching ${url}! status: ${response.status}`,
          );
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({
          passport: { ...get().passport, circuits_dns_mapping: data.data },
        });
      } catch (error) {
        console.error(
          `Failed fetching circuit DNS mapping from ${url}:`,
          error,
        );
      }
    },
    fetch_csca_tree: async (environment: 'prod' | 'stg') => {
      const url =
        environment === 'prod' ? CSCA_TREE_URL : CSCA_TREE_URL_STAGING;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `HTTP error fetching ${url}! status: ${response.status}`,
          );
        }
        const responseText = await response.text();
        const rawData = JSON.parse(responseText);

        let treeData: any;
        if (rawData && rawData.data) {
          treeData =
            typeof rawData.data === 'string'
              ? JSON.parse(rawData.data)
              : rawData.data;
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
          throw new Error(
            `HTTP error fetching ${url}! status: ${response.status}`,
          );
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
      const url =
        environment === 'prod' ? IDENTITY_TREE_URL : IDENTITY_TREE_URL_STAGING;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `HTTP error fetching ${url}! status: ${response.status}`,
          );
        }
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        set({ passport: { ...get().passport, commitment_tree: data.data } });
      } catch (error) {
        console.error(`Failed fetching identity tree from ${url}:`, error);
        // Optionally handle error state
      }
    },
  },
}));
