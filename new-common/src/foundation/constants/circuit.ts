export const CIRCUIT_CONSTANTS = {
  REGISTER_NULLIFIER_INDEX: 0,
  REGISTER_COMMITMENT_INDEX: 1,
  REGISTER_MERKLE_ROOT_INDEX: 2,

  DSC_TREE_LEAF_INDEX: 0,
  DSC_CSCA_ROOT_INDEX: 1,

  VC_AND_DISCLOSE_REVEALED_DATA_PACKED_INDEX: 0,
  VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX: 3,
  VC_AND_DISCLOSE_NULLIFIER_INDEX: 7,
  VC_AND_DISCLOSE_ATTESTATION_ID_INDEX: 8,
  VC_AND_DISCLOSE_MERKLE_ROOT_INDEX: 9,
  VC_AND_DISCLOSE_CURRENT_DATE_INDEX: 10,
  VC_AND_DISCLOSE_PASSPORT_NO_SMT_ROOT_INDEX: 16,
  VC_AND_DISCLOSE_NAME_DOB_SMT_ROOT_INDEX: 17,
  VC_AND_DISCLOSE_NAME_YOB_SMT_ROOT_INDEX: 18,
  VC_AND_DISCLOSE_SCOPE_INDEX: 19,
  VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX: 20,
};

export const CIRCUIT_TYPES = ['dsc', 'register', 'vc_and_disclose'];

export const COMMITMENT_TREE_DEPTH = 33;

export const CSCA_TREE_DEPTH = 12;

export const DSC_TREE_DEPTH = 21;

export const OFAC_TREE_LEVELS = 64;

export const DEFAULT_MAJORITY = '18';

export const circuitNameFromMode = {
  prove: 'prove',
  prove_onchain: 'prove',
  prove_offchain: 'prove',
  register: 'prove',
  vc_and_disclose: 'vc_and_disclose',
  dsc: 'dsc',
};

export const circuitToSelectorMode = {
  register: [0, 0],
  prove_onchain: [1, 0],
  prove_offchain: [1, 1],
};
