// Re-export commonly used constants from constants.ts for optimal tree shaking
export type { Country3LetterCode } from './constants.js';
export {
  API_URL,
  API_URL_STAGING,
  CIRCUIT_CONSTANTS,
  CSCA_TREE_URL,
  CSCA_TREE_URL_ID_CARD,
  CSCA_TREE_URL_STAGING,
  CSCA_TREE_URL_STAGING_ID_CARD,
  DEFAULT_MAJORITY,
  DSC_TREE_URL,
  DSC_TREE_URL_ID_CARD,
  DSC_TREE_URL_STAGING,
  DSC_TREE_URL_STAGING_ID_CARD,
  DscVerifierId,
  IDENTITY_TREE_URL,
  IDENTITY_TREE_URL_ID_CARD,
  IDENTITY_TREE_URL_STAGING,
  IDENTITY_TREE_URL_STAGING_ID_CARD,
  ID_CARD_ATTESTATION_ID,
  PASSPORT_ATTESTATION_ID,
  PCR0_MANAGER_ADDRESS,
  REDIRECT_URL,
  RPC_URL,
  RegisterVerifierId,
  SignatureAlgorithmIndex,
  TREE_URL,
  TREE_URL_STAGING,
  WS_DB_RELAYER,
  WS_DB_RELAYER_STAGING,
  attributeToPosition,
  attributeToPosition_ID,
  countryCodes,
} from './constants.js';

// Re-export from other constant files
export {
  alpha2ToAlpha3,
  alpha3ToAlpha2,
  commonNames,
  countries,
  getCountryISO2,
} from './countries.js';
