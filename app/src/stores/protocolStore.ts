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
    csca_tree: any;
    deployed_circuits: any;
    circuits_dns_mapping: any;
    fetch_deployed_circuits: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_circuits_dns_mapping: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_csca_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_dsc_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_identity_tree: (environment: 'prod' | 'stg') => Promise<void>;
    fetch_all: (environment: 'prod' | 'stg') => Promise<void>;
  };
}

export const useProtocolStore = create<ProtocolState>((set, get) => ({
  passport: {
    commitment_tree: null,
    dsc_tree: null,
    csca_tree: null,
    deployed_circuits: null,
    circuits_dns_mapping: null,
    fetch_all: async (environment: 'prod' | 'stg') => {
      await Promise.all([
        get().passport.fetch_deployed_circuits(environment),
        get().passport.fetch_circuits_dns_mapping(environment),
        get().passport.fetch_csca_tree(environment),
        get().passport.fetch_dsc_tree(environment),
        get().passport.fetch_identity_tree(environment),
      ]);
    },
    fetch_deployed_circuits: async (environment: 'prod' | 'stg') => {
      const response = await fetch(
        `${
          environment === 'prod' ? API_URL : API_URL_STAGING
        }/deployed-circuits`,
      );
      const data = await response.json();
      set({ passport: { ...get().passport, deployed_circuits: data.data } });
    },
    fetch_circuits_dns_mapping: async (environment: 'prod' | 'stg') => {
      const response = await fetch(
        `${
          environment === 'prod' ? API_URL : API_URL_STAGING
        }/circuit-dns-mapping`,
      );
      const data = await response.json();
      set({ passport: { ...get().passport, circuits_dns_mapping: data.data } });
    },
    fetch_csca_tree: async (environment: 'prod' | 'stg') => {
      const response = await fetch(
        `${environment === 'prod' ? CSCA_TREE_URL : CSCA_TREE_URL_STAGING}`,
      );
      const data = await response.json();
      set({ passport: { ...get().passport, csca_tree: data.data } });
    },
    fetch_dsc_tree: async (environment: 'prod' | 'stg') => {
      const response = await fetch(
        `${environment === 'prod' ? DSC_TREE_URL : DSC_TREE_URL_STAGING}`,
      );
      const data = await response.json();
      set({ passport: { ...get().passport, dsc_tree: data.data } });
    },
    fetch_identity_tree: async (environment: 'prod' | 'stg') => {
      const response = await fetch(
        `${
          environment === 'prod' ? IDENTITY_TREE_URL : IDENTITY_TREE_URL_STAGING
        }`,
      );
      const data = await response.json();
      set({ passport: { ...get().passport, commitment_tree: data.data } });
    },
  },
}));
