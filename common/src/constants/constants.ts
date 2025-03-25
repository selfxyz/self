export const TREE_TRACKER_URL = 'https://tree.self.xyz';
export const CSCA_TREE_DEPTH = 12;
export const DSC_TREE_DEPTH = 21;
export const COMMITMENT_TREE_DEPTH = 33;
export const DEFAULT_USER_ID_TYPE = 'uuid';

export const REDIRECT_URL = 'https://redirect.self.xyz';
export const WS_RPC_URL_VC_AND_DISCLOSE = "ws://disclose.proving.self.xyz:8888/";
export const WS_DB_RELAYER = 'wss://websocket.self.xyz';
export const WS_DB_RELAYER_STAGING = 'wss://websocket.staging.self.xyz';
export const API_URL = 'https://api.self.xyz';
export const API_URL_STAGING = 'https://api.staging.self.xyz';
export const CSCA_TREE_URL = 'https://tree.self.xyz/csca';
export const DSC_TREE_URL = 'https://tree.self.xyz/dsc';
export const CSCA_TREE_URL_STAGING = 'https://tree.staging.self.xyz/csca';
export const DSC_TREE_URL_STAGING = 'https://tree.staging.self.xyz/dsc';
export const IDENTITY_TREE_URL = 'https://tree.self.xyz/identity';
export const IDENTITY_TREE_URL_STAGING = 'https://tree.staging.self.xyz/identity';

export const PASSPORT_ATTESTATION_ID = '1'; //"8518753152044246090169372947057357973469996808638122125210848696986717482788"

export const CHAIN_NAME = 'celo';
export const RPC_URL = 'https://forno.celo.org';
export const PCR0_MANAGER_ADDRESS = '0xE36d4EE5Fd3916e703A46C21Bb3837dB7680C8B8';


// we make it global here because passing it to generateCircuitInputsRegister caused trouble
export const DEVELOPMENT_MODE = true;
export const DEFAULT_MAJORITY = '18';

export const hashAlgos = ['sha512', 'sha384', 'sha256', 'sha224', 'sha1'];
export const saltLengths = [64, 48, 32];

export const MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 40;

export const DEPLOYED_CIRCUITS_REGISTER = [
  'register_sha1_sha1_sha1_rsa_65537_4096',
  'register_sha1_sha256_sha256_rsa_65537_4096',
  'register_sha224_sha224_sha224_ecdsa_brainpoolP224r1',
  'register_sha256_sha224_sha224_ecdsa_secp224r1',
  'register_sha256_sha256_sha256_ecdsa_brainpoolP256r1',
  'register_sha256_sha256_sha256_ecdsa_brainpoolP384r1',
  'register_sha256_sha256_sha256_ecdsa_secp256r1',
  'register_sha256_sha256_sha256_ecdsa_secp384r1',
  'register_sha256_sha256_sha256_rsa_3_4096',
  'register_sha256_sha256_sha256_rsa_65537_4096',
  'register_sha256_sha256_sha256_rsapss_3_32_2048',
  'register_sha256_sha256_sha256_rsapss_65537_32_2048',
  'register_sha256_sha256_sha256_rsapss_65537_32_3072',
  'register_sha384_sha384_sha384_ecdsa_brainpoolP384r1',
  'register_sha384_sha384_sha384_ecdsa_brainpoolP512r1',
  'register_sha384_sha384_sha384_ecdsa_secp384r1',
  'register_sha384_sha384_sha384_rsapss_65537_48_2048',
  'register_sha1_sha1_sha1_ecdsa_brainpoolP224r1',
  'register_sha512_sha512_sha512_ecdsa_brainpoolP512r1',
  'register_sha512_sha512_sha512_rsa_65537_4096',
  'register_sha512_sha512_sha512_rsapss_65537_64_2048',
]

export const OFAC_TREE_LEVELS = 64;

export const DEPLOYED_CIRCUITS_DSC = [
  'dsc_sha1_ecdsa_brainpoolP256r1',
  'dsc_sha1_rsa_65537_4096',
  'dsc_sha256_ecdsa_brainpoolP256r1',
  'dsc_sha256_ecdsa_brainpoolP384r1',
  'dsc_sha256_ecdsa_secp256r1',
  'dsc_sha256_ecdsa_secp384r1',
  'dsc_sha256_rsa_65537_4096',
  'dsc_sha256_rsapss_3_32_3072',
  'dsc_sha256_rsapss_65537_32_3072',
  'dsc_sha256_rsapss_65537_32_4096',
  'dsc_sha384_ecdsa_brainpoolP384r1',
  'dsc_sha384_ecdsa_brainpoolP512r1',
  'dsc_sha384_ecdsa_secp384r1',
  'dsc_sha512_ecdsa_brainpoolP512r1',
  'dsc_sha512_rsa_65537_4096',
  'dsc_sha512_rsapss_65537_64_4096',
]

export const MAX_PADDED_ECONTENT_LEN: Partial<Record<(typeof hashAlgos)[number], number>> = {
  sha1: 384,
  sha224: 512,
  sha256: 512,
  sha384: 768,
  sha512: 896,
};

export const MAX_PADDED_SIGNED_ATTR_LEN: Record<(typeof hashAlgos)[number], number> = {
  sha1: 128,
  sha224: 128,
  sha256: 128,
  sha384: 256,
  sha512: 256,
};

export const MAX_CERT_BYTES: Partial<Record<keyof typeof SignatureAlgorithmIndex, number>> = {
  rsa_sha256_65537_4096: 512,
  rsa_sha1_65537_4096: 640,
  rsapss_sha256_65537_2048: 640,
  rsapss_sha256_65537_3072: 640,
  rsapss_sha256_65537_4096: 768,
  rsapss_sha256_3_3072: 768,
  rsapss_sha256_3_4096: 768,
  rsapss_sha384_65537_3072: 768,
};

export const ECDSA_K_LENGTH_FACTOR = 2;
// possible values because of sha1 constaints: 192,320,384, 448, 576, 640

export const CIRCUIT_TYPES = ['dsc', 'register', 'vc_and_disclose']
export const circuitNameFromMode = {
  prove: 'prove',
  prove_onchain: 'prove',
  prove_offchain: 'prove',
  register: 'prove',
  vc_and_disclose: 'vc_and_disclose',
  dsc: 'dsc',
};

export enum RegisterVerifierId {
  register_sha256_sha256_sha256_rsa_65537_4096 = 0,
  register_sha256_sha256_sha256_ecdsa_brainpoolP384r1 = 1,
  register_sha256_sha256_sha256_ecdsa_secp256r1 = 2,
  register_sha256_sha256_sha256_ecdsa_secp384r1 = 3,
  register_sha256_sha256_sha256_rsa_3_4096 = 4,
  register_sha256_sha256_sha256_rsapss_3_32_2048 = 5,
  register_sha256_sha256_sha256_rsapss_65537_32_2048 = 6,
  register_sha256_sha256_sha256_rsapss_65537_32_3072 = 7,
  register_sha384_sha384_sha384_ecdsa_brainpoolP384r1 = 8,
  register_sha384_sha384_sha384_ecdsa_brainpoolP512r1 = 9,
  register_sha384_sha384_sha384_ecdsa_secp384r1 = 10,
  register_sha512_sha512_sha512_ecdsa_brainpoolP512r1 = 11,
  register_sha512_sha512_sha512_rsa_65537_4096 = 12,
  register_sha512_sha512_sha512_rsapss_65537_64_2048 = 13,
  register_sha1_sha1_sha1_rsa_65537_4096 = 14,
  register_sha1_sha256_sha256_rsa_65537_4096 = 15,
  register_sha224_sha224_sha224_ecdsa_brainpoolP224r1 = 16,
  register_sha256_sha224_sha224_ecdsa_secp224r1 = 17,
  register_sha256_sha256_sha256_ecdsa_brainpoolP256r1 = 18,
  register_sha1_sha1_sha1_ecdsa_brainpoolP224r1 = 19,
  register_sha384_sha384_sha384_rsapss_65537_48_2048 = 20,
};

export enum DscVerifierId {
  dsc_sha1_ecdsa_brainpoolP256r1 = 0,
  dsc_sha1_rsa_65537_4096 = 1,
  dsc_sha256_ecdsa_brainpoolP256r1 = 2,
  dsc_sha256_ecdsa_brainpoolP384r1 = 3,
  dsc_sha256_ecdsa_secp256r1 = 4,
  dsc_sha256_ecdsa_secp384r1 = 5,
  dsc_sha256_ecdsa_secp521r1 = 6,
  dsc_sha256_rsa_65537_4096 = 7,
  dsc_sha256_rsapss_3_32_3072 = 8,
  dsc_sha256_rsapss_65537_32_3072 = 9,
  dsc_sha256_rsapss_65537_32_4096 = 10,
  dsc_sha384_ecdsa_brainpoolP384r1 = 11,
  dsc_sha384_ecdsa_brainpoolP512r1 = 12,
  dsc_sha384_ecdsa_secp384r1 = 13,
  dsc_sha512_ecdsa_brainpoolP512r1 = 14,
  dsc_sha512_ecdsa_secp521r1 = 15,
  dsc_sha512_rsa_65537_4096 = 16,
  dsc_sha512_rsapss_65537_64_4096 = 17,
  dsc_sha256_rsapss_3_32_4096 = 18,
};

export enum SignatureAlgorithmIndex {
  rsa_sha256_65537_2048 = 1,
  rsa_sha1_65537_2048 = 3,
  rsapss_sha256_65537_2048 = 4,
  ecdsa_sha1_secp256r1_256 = 7,
  ecdsa_sha256_secp256r1_256 = 8,
  ecdsa_sha384_secp384r1_384 = 9,
  rsa_sha256_65537_4096 = 10,
  rsa_sha1_65537_4096 = 11,
  rsapss_sha256_65537_4096 = 12,
  rsa_sha256_3_2048 = 13,
  rsa_sha256_65537_3072 = 14,
  rsa_sha512_65537_4096 = 15,
  rsapss_sha256_3_3072 = 16,
  rsapss_sha256_3_4096 = 17,
  rsapss_sha384_65537_3072 = 18,
  rsapss_sha256_65537_3072 = 19,
  ecdsa_sha256_brainpoolP256r1_256 = 21,
  ecdsa_sha384_brainpoolP384r1_384 = 22,
  ecdsa_sha256_secp384r1_384 = 23,
  ecdsa_sha384_brainpoolP256r1_256 = 24,
  ecdsa_sha512_brainpoolP256r1_256 = 25,
  ecdsa_sha512_brainpoolP384r1_384 = 26,
  ecdsa_sha1_brainpoolP224r1_224 = 27,
  ecdsa_sha256_brainpoolP224r1_224 = 28,
  ecdsa_sha512_brainpoolP512r1_512 = 29,
  ecdsa_sha224_brainpoolP224r1_224 = 30,
  rsa_sha256_3_4096 = 32,
  rsa_sha1_3_4096 = 33,
  rsa_sha384_65537_4096 = 34,
  rsapss_sha384_65537_4096 = 35,
  ecdsa_sha1_brainpoolP256r1_256 = 36,
  ecdsa_sha512_secp521r1_521 = 41,
}

export const attributeToPosition = {
  issuing_state: [2, 4],
  name: [5, 43],
  passport_number: [44, 52],
  nationality: [54, 56],
  date_of_birth: [57, 62],
  gender: [64, 64],
  expiry_date: [65, 70],
  older_than: [88, 89],
  ofac: [90, 90],
};

export const circuitToSelectorMode = {
  register: [0, 0],
  prove_onchain: [1, 0],
  prove_offchain: [1, 1],
};

export const revealedDataTypes = {
  'issuing_state': 0,
  'name': 1,
  'passport_number': 2,
  'nationality': 3,
  'date_of_birth': 4,
  'gender': 5,
  'expiry_date': 6,
  'older_than': 7,
  'passport_no_ofac': 8,
  'name_and_dob_ofac': 9,
  'name_and_yob_ofac': 10,
}

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
}

export const MAX_BYTES_IN_FIELD = 31;
export const MAX_PUBKEY_DSC_BYTES = 525;

export const MAX_DATAHASHES_LEN = 320; // max formatted and concatenated datagroup hashes length in bytes
export const n_dsc = 120;
export const n_dsc_3072 = 120;
export const n_dsc_4096 = 120;
export const k_dsc = 35;
export const k_dsc_3072 = 35; //48;
export const k_dsc_4096 = 35;
export const n_csca = 120;
export const k_csca = 35;
export const n_dsc_ecdsa = 64;
export const k_dsc_ecdsa = 4;
export const max_dsc_bytes = 1792;
export const max_csca_bytes = 1792;

export const countryCodes = {
  AFG: 'Afghanistan',
  ALA: 'Aland Islands',
  ALB: 'Albania',
  DZA: 'Algeria',
  ASM: 'American Samoa',
  AND: 'Andorra',
  AGO: 'Angola',
  AIA: 'Anguilla',
  ATA: 'Antarctica',
  ATG: 'Antigua and Barbuda',
  ARG: 'Argentina',
  ARM: 'Armenia',
  ABW: 'Aruba',
  AUS: 'Australia',
  AUT: 'Austria',
  AZE: 'Azerbaijan',
  BHS: 'Bahamas',
  BHR: 'Bahrain',
  BGD: 'Bangladesh',
  BRB: 'Barbados',
  BLR: 'Belarus',
  BEL: 'Belgium',
  BLZ: 'Belize',
  BEN: 'Benin',
  BMU: 'Bermuda',
  BTN: 'Bhutan',
  BOL: 'Bolivia (Plurinational State of)',
  BES: 'Bonaire, Sint Eustatius and Saba',
  BIH: 'Bosnia and Herzegovina',
  BWA: 'Botswana',
  BVT: 'Bouvet Island',
  BRA: 'Brazil',
  IOT: 'British Indian Ocean Territory',
  BRN: 'Brunei Darussalam',
  BGR: 'Bulgaria',
  BFA: 'Burkina Faso',
  BDI: 'Burundi',
  CPV: 'Cabo Verde',
  KHM: 'Cambodia',
  CMR: 'Cameroon',
  CAN: 'Canada',
  CYM: 'Cayman Islands',
  CAF: 'Central African Republic',
  TCD: 'Chad',
  CHL: 'Chile',
  CHN: 'China',
  CXR: 'Christmas Island',
  CCK: 'Cocos (Keeling) Islands',
  COL: 'Colombia',
  COM: 'Comoros',
  COG: 'Congo',
  COD: 'Congo, Democratic Republic of the',
  COK: 'Cook Islands',
  CRI: 'Costa Rica',
  CIV: "Cote d'Ivoire",
  HRV: 'Croatia',
  CUB: 'Cuba',
  CUW: 'Curacao',
  CYP: 'Cyprus',
  CZE: 'Czechia',
  DNK: 'Denmark',
  DJI: 'Djibouti',
  DMA: 'Dominica',
  DOM: 'Dominican Republic',
  ECU: 'Ecuador',
  EGY: 'Egypt',
  SLV: 'El Salvador',
  GNQ: 'Equatorial Guinea',
  ERI: 'Eritrea',
  EST: 'Estonia',
  EUE: 'European Union',
  SWZ: 'Eswatini',
  ETH: 'Ethiopia',
  FLK: 'Falkland Islands (Malvinas)',
  FRO: 'Faroe Islands',
  FJI: 'Fiji',
  FIN: 'Finland',
  FRA: 'France',
  GUF: 'French Guiana',
  PYF: 'French Polynesia',
  ATF: 'French Southern Territories',
  GAB: 'Gabon',
  GMB: 'Gambia',
  GEO: 'Georgia',
  DEU: 'Germany',
  "D<<": 'Germany', // Bundesrepublik Deutschland uses this in passports instead of DEU
  GHA: 'Ghana',
  GIB: 'Gibraltar',
  GRC: 'Greece',
  GRL: 'Greenland',
  GRD: 'Grenada',
  GLP: 'Guadeloupe',
  GUM: 'Guam',
  GTM: 'Guatemala',
  GGY: 'Guernsey',
  GIN: 'Guinea',
  GNB: 'Guinea-Bissau',
  GUY: 'Guyana',
  HTI: 'Haiti',
  HMD: 'Heard Island and McDonald Islands',
  VAT: 'Holy See',
  HND: 'Honduras',
  HKG: 'Hong Kong',
  HUN: 'Hungary',
  ISL: 'Iceland',
  IND: 'India',
  IDN: 'Indonesia',
  IRN: 'Iran (Islamic Republic of)',
  IRQ: 'Iraq',
  IRL: 'Ireland',
  IMN: 'Isle of Man',
  ISR: 'Israel',
  ITA: 'Italy',
  JAM: 'Jamaica',
  JPN: 'Japan',
  JEY: 'Jersey',
  JOR: 'Jordan',
  KAZ: 'Kazakhstan',
  KEN: 'Kenya',
  KIR: 'Kiribati',
  PRK: "Korea (Democratic People's Republic of)",
  KOR: 'Korea, Republic of',
  KWT: 'Kuwait',
  KGZ: 'Kyrgyzstan',
  LAO: "Lao People's Democratic Republic",
  LVA: 'Latvia',
  LBN: 'Lebanon',
  LSO: 'Lesotho',
  LBR: 'Liberia',
  LBY: 'Libya',
  LIE: 'Liechtenstein',
  LTU: 'Lithuania',
  LUX: 'Luxembourg',
  MAC: 'Macao',
  MDG: 'Madagascar',
  MWI: 'Malawi',
  MYS: 'Malaysia',
  MDV: 'Maldives',
  MLI: 'Mali',
  MLT: 'Malta',
  MHL: 'Marshall Islands',
  MTQ: 'Martinique',
  MRT: 'Mauritania',
  MUS: 'Mauritius',
  MYT: 'Mayotte',
  MEX: 'Mexico',
  FSM: 'Micronesia (Federated States of)',
  MDA: 'Moldova, Republic of',
  MCO: 'Monaco',
  MNG: 'Mongolia',
  MNE: 'Montenegro',
  MSR: 'Montserrat',
  MAR: 'Morocco',
  MOZ: 'Mozambique',
  MMR: 'Myanmar',
  NAM: 'Namibia',
  NRU: 'Nauru',
  NPL: 'Nepal',
  NLD: 'Netherlands',
  NCL: 'New Caledonia',
  NZL: 'New Zealand',
  NIC: 'Nicaragua',
  NER: 'Niger',
  NGA: 'Nigeria',
  NIU: 'Niue',
  NFK: 'Norfolk Island',
  MKD: 'North Macedonia',
  MNP: 'Northern Mariana Islands',
  NOR: 'Norway',
  OMN: 'Oman',
  PAK: 'Pakistan',
  PLW: 'Palau',
  PSE: 'Palestine, State of',
  PAN: 'Panama',
  PNG: 'Papua New Guinea',
  PRY: 'Paraguay',
  PER: 'Peru',
  PHL: 'Philippines',
  PCN: 'Pitcairn',
  POL: 'Poland',
  PRT: 'Portugal',
  PRI: 'Puerto Rico',
  QAT: 'Qatar',
  REU: 'Reunion',
  ROU: 'Romania',
  RUS: 'Russian Federation',
  RWA: 'Rwanda',
  BLM: 'Saint Barthelemy',
  SHN: 'Saint Helena, Ascension and Tristan da Cunha',
  KNA: 'Saint Kitts and Nevis',
  LCA: 'Saint Lucia',
  MAF: 'Saint Martin (French part)',
  SPM: 'Saint Pierre and Miquelon',
  VCT: 'Saint Vincent and the Grenadines',
  WSM: 'Samoa',
  SMR: 'San Marino',
  STP: 'Sao Tome and Principe',
  SAU: 'Saudi Arabia',
  SEN: 'Senegal',
  SRB: 'Serbia',
  SYC: 'Seychelles',
  SLE: 'Sierra Leone',
  SGP: 'Singapore',
  SXM: 'Sint Maarten (Dutch part)',
  SVK: 'Slovakia',
  SVN: 'Slovenia',
  SLB: 'Solomon Islands',
  SOM: 'Somalia',
  ZAF: 'South Africa',
  SGS: 'South Georgia and the South Sandwich Islands',
  SSD: 'South Sudan',
  ESP: 'Spain',
  LKA: 'Sri Lanka',
  SDN: 'Sudan',
  SUR: 'Suriname',
  SJM: 'Svalbard and Jan Mayen',
  SWE: 'Sweden',
  CHE: 'Switzerland',
  SYR: 'Syrian Arab Republic',
  TWN: 'Taiwan, Province of China',
  TJK: 'Tajikistan',
  TZA: 'Tanzania, United Republic of',
  THA: 'Thailand',
  TLS: 'Timor-Leste',
  TGO: 'Togo',
  TKL: 'Tokelau',
  TON: 'Tonga',
  TTO: 'Trinidad and Tobago',
  TUN: 'Tunisia',
  TUR: 'Turkey',
  TKM: 'Turkmenistan',
  TCA: 'Turks and Caicos Islands',
  TUV: 'Tuvalu',
  UGA: 'Uganda',
  UKR: 'Ukraine',
  UNO: 'United Nations',
  UNA: 'United Nations',
  ARE: 'United Arab Emirates',
  GBR: 'United Kingdom of Great Britain and Northern Ireland',
  USA: 'United States of America',
  UMI: 'United States Minor Outlying Islands',
  URY: 'Uruguay',
  UZB: 'Uzbekistan',
  VUT: 'Vanuatu',
  VEN: 'Venezuela (Bolivarian Republic of)',
  VNM: 'Viet Nam',
  VGB: 'Virgin Islands (British)',
  VIR: 'Virgin Islands (U.S.)',
  WLF: 'Wallis and Futuna',
  ESH: 'Western Sahara',
  YEM: 'Yemen',
  ZMB: 'Zambia',
  ZWE: 'Zimbabwe',
  XPO: "International Criminal Police Organization",
  XCE: "Council of Europe",
  XOM: "Sovereign Military Order of Malta",
};
// not using a library for this as the entry countries use can be differnt than the ISO 3166-1 alpha-3 standard
export type Country3LetterCode = keyof typeof countryCodes;

export function getCountryCode(countryName: string): string | string {
  const entries = Object.entries(countryCodes);
  const found = entries.find(([_, name]) => name.toLowerCase() === countryName.toLowerCase());
  return found ? found[0] : 'undefined';
}

export const contribute_publicKey = `-----BEGIN RSA PUBLIC KEY-----
MIICCgKCAgEAv/hm7FZZ2KBmaeDHmLoRwuWmCcNKT561RqbsW8ZuYSyPWJUldE9U
Cf0lW3K1H5lsSDkl0Cq84cooL9f6X59Mffb/N24ZKTdL0xdcPwjk4LbcrVm8qubL
0a/4uCNoZZ1my4nxbpLxYtbr8CNmUGvBOVKf8IcjsY6VghIZrO63G6BN/G44su1Z
WcHpboGt9SDQK4enCyKxnCD+PbDYlewSA0n3GRajFfZex1bj1EvrS2hTLv8oNH5e
9H+3TUke0uO6Ttl0bZepoMmPlpAXhJByISqC6SLth4WFIH+G1I/xt9AEM7hOfLMl
KQv/3wlLEgEueRryKAHB2tqkaDKVJyw+tOyWj2iWA+nVgQKAxO4hOw01ljyVbcx6
KboXwnamlZPFIx4tjEaZ+ClXCFqvXhE9LDFK11QsYzJZl0aRVfTNqcurhEt7SK0f
qzOBhID0Nxk4k9sW1uT6ocW1xp1SB2WotORssOKIAOLJM8IbPl6n/DkYNcfvyXI7
4BlUrf6M2DgZMYATabIy94AvopHJOyiRfh4NpQPDntWnShiI1em2MmtXiWFCdVFV
6/QfJTKVixJpVfDh386ALXc97EPWDMWIalUwYoV/eRSMnuV8nZ0+Ctp3Qrtk/JYd
+FWhKbtlPeRjmGVr6mVlvDJ7KqtY5/RqqwfWeXhXezGhQqQ/OoQQCRkCAwEAAQ==
-----END RSA PUBLIC KEY-----`;

export const DEFAULT_RPC_URL = 'https://mainnet.optimism.io';
export const REGISTER_CONTRACT_ADDRESS = '0x3F346FFdC5d583e4126AF01A02Ac5b9CdB3f1909';
export const SBT_CONTRACT_ADDRESS = '0x601Fd54FD11C5E77DE84d877e55B829aff20f0A6';

export type CountryListKeys = keyof typeof countryList;
export type CountryOfficialName = typeof countryList[CountryListKeys]['officialName'];
export type CountryCommonName = typeof countryList[CountryListKeys]['commonName'];
export type CountryCca3 = typeof countryList[CountryListKeys]['cca3'];

export const countryList = {
  ARUBA: {
    officialName: "Aruba",
    commonName: "Aruba",
    cca3: "ABW",
  },
  AFGHANISTAN: {
    officialName: "Afghanistan",
    commonName: "Afghanistan",
    cca3: "AFG",
  },
  ANGOLA: {
    officialName: "Angola",
    commonName: "Angola",
    cca3: "AGO",
  },
  ANGUILLA: {
    officialName: "Anguilla",
    commonName: "Anguilla",
    cca3: "AIA",
  },
  ALAND_ISLANDS: {
    officialName: "Aland Islands",
    commonName: "Aland Islands",
    cca3: "ALA",
  },
  ALBANIA: {
    officialName: "Albania",
    commonName: "Albania",
    cca3: "ALB",
  },
  ANDORRA: {
    officialName: "Andorra",
    commonName: "Andorra",
    cca3: "AND",
  },
  UNITED_ARAB_EMIRATES: {
    officialName: "United Arab Emirates",
    commonName: "United Arab Emirates",
    cca3: "ARE",
  },
  ARGENTINA: {
    officialName: "Argentina",
    commonName: "Argentina",
    cca3: "ARG",
  },
  ARMENIA: {
    officialName: "Armenia",
    commonName: "Armenia",
    cca3: "ARM",
  },
  AMERICAN_SAMOA: {
    officialName: "American Samoa",
    commonName: "American Samoa",
    cca3: "ASM",
  },
  ANTARCTICA: {
    officialName: "Antarctica",
    commonName: "Antarctica",
    cca3: "ATA",
  },
  FRENCH_SOUTHERN_AND_ANTARCTIC_LANDS: {
    officialName: "French Southern Territories",
    commonName: "French Southern And Antarctic Lands",
    cca3: "ATF",
  },
  ANTIGUA_AND_BARBUDA: {
    officialName: "Antigua and Barbuda",
    commonName: "Antigua And Barbuda",
    cca3: "ATG",
  },
  AUSTRALIA: {
    officialName: "Australia",
    commonName: "Australia",
    cca3: "AUS",
  },
  AUSTRIA: {
    officialName: "Austria",
    commonName: "Austria",
    cca3: "AUT",
  },
  AZERBAIJAN: {
    officialName: "Azerbaijan",
    commonName: "Azerbaijan",
    cca3: "AZE",
  },
  BURUNDI: {
    officialName: "Burundi",
    commonName: "Burundi",
    cca3: "BDI",
  },
  BELGIUM: {
    officialName: "Belgium",
    commonName: "Belgium",
    cca3: "BEL",
  },
  BENIN: {
    officialName: "Benin",
    commonName: "Benin",
    cca3: "BEN",
  },
  BURKINA_FASO: {
    officialName: "Burkina Faso",
    commonName: "Burkina Faso",
    cca3: "BFA",
  },
  BANGLADESH: {
    officialName: "Bangladesh",
    commonName: "Bangladesh",
    cca3: "BGD",
  },
  BULGARIA: {
    officialName: "Bulgaria",
    commonName: "Bulgaria",
    cca3: "BGR",
  },
  BAHRAIN: {
    officialName: "Bahrain",
    commonName: "Bahrain",
    cca3: "BHR",
  },
  BAHAMAS: {
    officialName: "Bahamas",
    commonName: "Bahamas",
    cca3: "BHS",
  },
  BOSNIA_AND_HERZEGOVINA: {
    officialName: "Bosnia and Herzegovina",
    commonName: "Bosnia And Herzegovina",
    cca3: "BIH",
  },
  SAINT_BARTHELEMY: {
    officialName: "Saint Barthelemy",
    commonName: "Saint Barthelemy",
    cca3: "BLM",
  },
  BELARUS: {
    officialName: "Belarus",
    commonName: "Belarus",
    cca3: "BLR",
  },
  BELIZE: {
    officialName: "Belize",
    commonName: "Belize",
    cca3: "BLZ",
  },
  BERMUDA: {
    officialName: "Bermuda",
    commonName: "Bermuda",
    cca3: "BMU",
  },
  BOLIVIA: {
    officialName: "Bolivia (Plurinational State of)",
    commonName: "Bolivia",
    cca3: "BOL",
  },
  CARIBBEAN_NETHERLANDS: {
    officialName: "Bonaire, Sint Eustatius and Saba",
    commonName: "Caribbean Netherlands",
    cca3: "BES",
  },
  BRAZIL: {
    officialName: "Brazil",
    commonName: "Brazil",
    cca3: "BRA",
  },
  BARBADOS: {
    officialName: "Barbados",
    commonName: "Barbados",
    cca3: "BRB",
  },
  BRUNEI: {
    officialName: "Brunei Darussalam",
    commonName: "Brunei",
    cca3: "BRN",
  },
  BHUTAN: {
    officialName: "Bhutan",
    commonName: "Bhutan",
    cca3: "BTN",
  },
  BOUVET_ISLAND: {
    officialName: "Bouvet Island",
    commonName: "Bouvet Island",
    cca3: "BVT",
  },
  BOTSWANA: {
    officialName: "Botswana",
    commonName: "Botswana",
    cca3: "BWA",
  },
  CENTRAL_AFRICAN_REPUBLIC: {
    officialName: "Central African Republic",
    commonName: "Central African Republic",
    cca3: "CAF",
  },
  CANADA: {
    officialName: "Canada",
    commonName: "Canada",
    cca3: "CAN",
  },
  COCOS_KEELING_ISLANDS: {
    officialName: "Cocos (Keeling) Islands",
    commonName: "Cocos Keeling Islands",
    cca3: "CCK",
  },
  SWITZERLAND: {
    officialName: "Switzerland",
    commonName: "Switzerland",
    cca3: "CHE",
  },
  CHILE: {
    officialName: "Chile",
    commonName: "Chile",
    cca3: "CHL",
  },
  CHINA: {
    officialName: "China",
    commonName: "China",
    cca3: "CHN",
  },
  IVORY_COAST: {
    officialName: "Cote d'Ivoire",
    commonName: "Ivory Coast",
    cca3: "CIV",
  },
  CAMEROON: {
    officialName: "Cameroon",
    commonName: "Cameroon",
    cca3: "CMR",
  },
  DR_CONGO: {
    officialName: "Congo, Democratic Republic of the",
    commonName: "Dr Congo",
    cca3: "COD",
  },
  REPUBLIC_OF_THE_CONGO: {
    officialName: "Congo",
    commonName: "Republic Of The Congo",
    cca3: "COG",
  },
  COOK_ISLANDS: {
    officialName: "Cook Islands",
    commonName: "Cook Islands",
    cca3: "COK",
  },
  COLOMBIA: {
    officialName: "Colombia",
    commonName: "Colombia",
    cca3: "COL",
  },
  COMOROS: {
    officialName: "Comoros",
    commonName: "Comoros",
    cca3: "COM",
  },
  CAPE_VERDE: {
    officialName: "Cabo Verde",
    commonName: "Cape Verde",
    cca3: "CPV",
  },
  COSTA_RICA: {
    officialName: "Costa Rica",
    commonName: "Costa Rica",
    cca3: "CRI",
  },
  CUBA: {
    officialName: "Cuba",
    commonName: "Cuba",
    cca3: "CUB",
  },
  CURACAO: {
    officialName: "Curacao",
    commonName: "Curacao",
    cca3: "CUW",
  },
  CHRISTMAS_ISLAND: {
    officialName: "Christmas Island",
    commonName: "Christmas Island",
    cca3: "CXR",
  },
  CAYMAN_ISLANDS: {
    officialName: "Cayman Islands",
    commonName: "Cayman Islands",
    cca3: "CYM",
  },
  CYPRUS: {
    officialName: "Cyprus",
    commonName: "Cyprus",
    cca3: "CYP",
  },
  CZECHIA: {
    officialName: "Czechia",
    commonName: "Czechia",
    cca3: "CZE",
  },
  GERMANY: {
    officialName: "Germany",
    commonName: "Germany",
    cca3: "D<<",
  },
  DJIBOUTI: {
    officialName: "Djibouti",
    commonName: "Djibouti",
    cca3: "DJI",
  },
  DOMINICA: {
    officialName: "Dominica",
    commonName: "Dominica",
    cca3: "DMA",
  },
  DENMARK: {
    officialName: "Denmark",
    commonName: "Denmark",
    cca3: "DNK",
  },
  DOMINICAN_REPUBLIC: {
    officialName: "Dominican Republic",
    commonName: "Dominican Republic",
    cca3: "DOM",
  },
  ALGERIA: {
    officialName: "Algeria",
    commonName: "Algeria",
    cca3: "DZA",
  },
  ECUADOR: {
    officialName: "Ecuador",
    commonName: "Ecuador",
    cca3: "ECU",
  },
  EGYPT: {
    officialName: "Egypt",
    commonName: "Egypt",
    cca3: "EGY",
  },
  ERITREA: {
    officialName: "Eritrea",
    commonName: "Eritrea",
    cca3: "ERI",
  },
  WESTERN_SAHARA: {
    officialName: "Western Sahara",
    commonName: "Western Sahara",
    cca3: "ESH",
  },
  SPAIN: {
    officialName: "Spain",
    commonName: "Spain",
    cca3: "ESP",
  },
  ESTONIA: {
    officialName: "Estonia",
    commonName: "Estonia",
    cca3: "EST",
  },
  EUROPEAN_UNION: {
    officialName: "European Union",
    commonName: "European Union",
    cca3: "EUE",
  },
  ETHIOPIA: {
    officialName: "Ethiopia",
    commonName: "Ethiopia",
    cca3: "ETH",
  },
  FINLAND: {
    officialName: "Finland",
    commonName: "Finland",
    cca3: "FIN",
  },
  FIJI: {
    officialName: "Fiji",
    commonName: "Fiji",
    cca3: "FJI",
  },
  FALKLAND_ISLANDS: {
    officialName: "Falkland Islands (Malvinas)",
    commonName: "Falkland Islands",
    cca3: "FLK",
  },
  FRANCE: {
    officialName: "France",
    commonName: "France",
    cca3: "FRA",
  },
  FAROE_ISLANDS: {
    officialName: "Faroe Islands",
    commonName: "Faroe Islands",
    cca3: "FRO",
  },
  MICRONESIA: {
    officialName: "Micronesia (Federated States of)",
    commonName: "Micronesia",
    cca3: "FSM",
  },
  GABON: {
    officialName: "Gabon",
    commonName: "Gabon",
    cca3: "GAB",
  },
  UNITED_KINGDOM: {
    officialName: "United Kingdom of Great Britain and Northern Ireland",
    commonName: "United Kingdom",
    cca3: "GBR",
  },
  GEORGIA: {
    officialName: "Georgia",
    commonName: "Georgia",
    cca3: "GEO",
  },
  GUERNSEY: {
    officialName: "Guernsey",
    commonName: "Guernsey",
    cca3: "GGY",
  },
  GHANA: {
    officialName: "Ghana",
    commonName: "Ghana",
    cca3: "GHA",
  },
  GIBRALTAR: {
    officialName: "Gibraltar",
    commonName: "Gibraltar",
    cca3: "GIB",
  },
  GUINEA: {
    officialName: "Guinea",
    commonName: "Guinea",
    cca3: "GIN",
  },
  GUADELOUPE: {
    officialName: "Guadeloupe",
    commonName: "Guadeloupe",
    cca3: "GLP",
  },
  GAMBIA: {
    officialName: "Gambia",
    commonName: "Gambia",
    cca3: "GMB",
  },
  GUINEABISSAU: {
    officialName: "Guinea-Bissau",
    commonName: "Guineabissau",
    cca3: "GNB",
  },
  EQUATORIAL_GUINEA: {
    officialName: "Equatorial Guinea",
    commonName: "Equatorial Guinea",
    cca3: "GNQ",
  },
  GREECE: {
    officialName: "Greece",
    commonName: "Greece",
    cca3: "GRC",
  },
  GRENADA: {
    officialName: "Grenada",
    commonName: "Grenada",
    cca3: "GRD",
  },
  GREENLAND: {
    officialName: "Greenland",
    commonName: "Greenland",
    cca3: "GRL",
  },
  GUATEMALA: {
    officialName: "Guatemala",
    commonName: "Guatemala",
    cca3: "GTM",
  },
  FRENCH_GUIANA: {
    officialName: "French Guiana",
    commonName: "French Guiana",
    cca3: "GUF",
  },
  GUAM: {
    officialName: "Guam",
    commonName: "Guam",
    cca3: "GUM",
  },
  GUYANA: {
    officialName: "Guyana",
    commonName: "Guyana",
    cca3: "GUY",
  },
  HONG_KONG: {
    officialName: "Hong Kong",
    commonName: "Hong Kong",
    cca3: "HKG",
  },
  HEARD_ISLAND_AND_MCDONALD_ISLANDS: {
    officialName: "Heard Island and McDonald Islands",
    commonName: "Heard Island And Mcdonald Islands",
    cca3: "HMD",
  },
  HONDURAS: {
    officialName: "Honduras",
    commonName: "Honduras",
    cca3: "HND",
  },
  CROATIA: {
    officialName: "Croatia",
    commonName: "Croatia",
    cca3: "HRV",
  },
  HAITI: {
    officialName: "Haiti",
    commonName: "Haiti",
    cca3: "HTI",
  },
  HUNGARY: {
    officialName: "Hungary",
    commonName: "Hungary",
    cca3: "HUN",
  },
  INDONESIA: {
    officialName: "Indonesia",
    commonName: "Indonesia",
    cca3: "IDN",
  },
  ISLE_OF_MAN: {
    officialName: "Isle of Man",
    commonName: "Isle Of Man",
    cca3: "IMN",
  },
  INDIA: {
    officialName: "India",
    commonName: "India",
    cca3: "IND",
  },
  BRITISH_INDIAN_OCEAN_TERRITORY: {
    officialName: "British Indian Ocean Territory",
    commonName: "British Indian Ocean Territory",
    cca3: "IOT",
  },
  IRELAND: {
    officialName: "Ireland",
    commonName: "Ireland",
    cca3: "IRL",
  },
  IRAN: {
    officialName: "Iran (Islamic Republic of)",
    commonName: "Iran",
    cca3: "IRN",
  },
  IRAQ: {
    officialName: "Iraq",
    commonName: "Iraq",
    cca3: "IRQ",
  },
  ICELAND: {
    officialName: "Iceland",
    commonName: "Iceland",
    cca3: "ISL",
  },
  ISRAEL: {
    officialName: "Israel",
    commonName: "Israel",
    cca3: "ISR",
  },
  ITALY: {
    officialName: "Italy",
    commonName: "Italy",
    cca3: "ITA",
  },
  JAMAICA: {
    officialName: "Jamaica",
    commonName: "Jamaica",
    cca3: "JAM",
  },
  JERSEY: {
    officialName: "Jersey",
    commonName: "Jersey",
    cca3: "JEY",
  },
  JORDAN: {
    officialName: "Jordan",
    commonName: "Jordan",
    cca3: "JOR",
  },
  JAPAN: {
    officialName: "Japan",
    commonName: "Japan",
    cca3: "JPN",
  },
  KAZAKHSTAN: {
    officialName: "Kazakhstan",
    commonName: "Kazakhstan",
    cca3: "KAZ",
  },
  KENYA: {
    officialName: "Kenya",
    commonName: "Kenya",
    cca3: "KEN",
  },
  KYRGYZSTAN: {
    officialName: "Kyrgyzstan",
    commonName: "Kyrgyzstan",
    cca3: "KGZ",
  },
  CAMBODIA: {
    officialName: "Cambodia",
    commonName: "Cambodia",
    cca3: "KHM",
  },
  KIRIBATI: {
    officialName: "Kiribati",
    commonName: "Kiribati",
    cca3: "KIR",
  },
  SAINT_KITTS_AND_NEVIS: {
    officialName: "Saint Kitts and Nevis",
    commonName: "Saint Kitts And Nevis",
    cca3: "KNA",
  },
  SOUTH_KOREA: {
    officialName: "Korea, Republic of",
    commonName: "South Korea",
    cca3: "KOR",
  },
  KOSOVO: {
    officialName: "Kosovo",
    commonName: "Kosovo",
    cca3: "UNK",
  },
  KUWAIT: {
    officialName: "Kuwait",
    commonName: "Kuwait",
    cca3: "KWT",
  },
  LAOS: {
    officialName: "Lao People's Democratic Republic",
    commonName: "Laos",
    cca3: "LAO",
  },
  LEBANON: {
    officialName: "Lebanon",
    commonName: "Lebanon",
    cca3: "LBN",
  },
  LIBERIA: {
    officialName: "Liberia",
    commonName: "Liberia",
    cca3: "LBR",
  },
  LIBYA: {
    officialName: "Libya",
    commonName: "Libya",
    cca3: "LBY",
  },
  SAINT_LUCIA: {
    officialName: "Saint Lucia",
    commonName: "Saint Lucia",
    cca3: "LCA",
  },
  LIECHTENSTEIN: {
    officialName: "Liechtenstein",
    commonName: "Liechtenstein",
    cca3: "LIE",
  },
  SRI_LANKA: {
    officialName: "Sri Lanka",
    commonName: "Sri Lanka",
    cca3: "LKA",
  },
  LESOTHO: {
    officialName: "Lesotho",
    commonName: "Lesotho",
    cca3: "LSO",
  },
  LITHUANIA: {
    officialName: "Lithuania",
    commonName: "Lithuania",
    cca3: "LTU",
  },
  LUXEMBOURG: {
    officialName: "Luxembourg",
    commonName: "Luxembourg",
    cca3: "LUX",
  },
  LATVIA: {
    officialName: "Latvia",
    commonName: "Latvia",
    cca3: "LVA",
  },
  MACAU: {
    officialName: "Macao",
    commonName: "Macau",
    cca3: "MAC",
  },
  SAINT_MARTIN: {
    officialName: "Saint Martin (French part)",
    commonName: "Saint Martin",
    cca3: "MAF",
  },
  MOROCCO: {
    officialName: "Morocco",
    commonName: "Morocco",
    cca3: "MAR",
  },
  MONACO: {
    officialName: "Monaco",
    commonName: "Monaco",
    cca3: "MCO",
  },
  MOLDOVA: {
    officialName: "Moldova, Republic of",
    commonName: "Moldova",
    cca3: "MDA",
  },
  MADAGASCAR: {
    officialName: "Madagascar",
    commonName: "Madagascar",
    cca3: "MDG",
  },
  MALDIVES: {
    officialName: "Maldives",
    commonName: "Maldives",
    cca3: "MDV",
  },
  MEXICO: {
    officialName: "Mexico",
    commonName: "Mexico",
    cca3: "MEX",
  },
  MARSHALL_ISLANDS: {
    officialName: "Marshall Islands",
    commonName: "Marshall Islands",
    cca3: "MHL",
  },
  NORTH_MACEDONIA: {
    officialName: "North Macedonia",
    commonName: "North Macedonia",
    cca3: "MKD",
  },
  MALI: {
    officialName: "Mali",
    commonName: "Mali",
    cca3: "MLI",
  },
  MALTA: {
    officialName: "Malta",
    commonName: "Malta",
    cca3: "MLT",
  },
  MYANMAR: {
    officialName: "Myanmar",
    commonName: "Myanmar",
    cca3: "MMR",
  },
  MONTENEGRO: {
    officialName: "Montenegro",
    commonName: "Montenegro",
    cca3: "MNE",
  },
  MONGOLIA: {
    officialName: "Mongolia",
    commonName: "Mongolia",
    cca3: "MNG",
  },
  NORTHERN_MARIANA_ISLANDS: {
    officialName: "Northern Mariana Islands",
    commonName: "Northern Mariana Islands",
    cca3: "MNP",
  },
  MOZAMBIQUE: {
    officialName: "Mozambique",
    commonName: "Mozambique",
    cca3: "MOZ",
  },
  MAURITANIA: {
    officialName: "Mauritania",
    commonName: "Mauritania",
    cca3: "MRT",
  },
  MONTSERRAT: {
    officialName: "Montserrat",
    commonName: "Montserrat",
    cca3: "MSR",
  },
  MARTINIQUE: {
    officialName: "Martinique",
    commonName: "Martinique",
    cca3: "MTQ",
  },
  MAURITIUS: {
    officialName: "Mauritius",
    commonName: "Mauritius",
    cca3: "MUS",
  },
  MALAWI: {
    officialName: "Malawi",
    commonName: "Malawi",
    cca3: "MWI",
  },
  MALAYSIA: {
    officialName: "Malaysia",
    commonName: "Malaysia",
    cca3: "MYS",
  },
  MAYOTTE: {
    officialName: "Mayotte",
    commonName: "Mayotte",
    cca3: "MYT",
  },
  NAMIBIA: {
    officialName: "Namibia",
    commonName: "Namibia",
    cca3: "NAM",
  },
  NEW_CALEDONIA: {
    officialName: "New Caledonia",
    commonName: "New Caledonia",
    cca3: "NCL",
  },
  NIGER: {
    officialName: "Niger",
    commonName: "Niger",
    cca3: "NER",
  },
  NORFOLK_ISLAND: {
    officialName: "Norfolk Island",
    commonName: "Norfolk Island",
    cca3: "NFK",
  },
  NIGERIA: {
    officialName: "Nigeria",
    commonName: "Nigeria",
    cca3: "NGA",
  },
  NICARAGUA: {
    officialName: "Nicaragua",
    commonName: "Nicaragua",
    cca3: "NIC",
  },
  NIUE: {
    officialName: "Niue",
    commonName: "Niue",
    cca3: "NIU",
  },
  NETHERLANDS: {
    officialName: "Netherlands",
    commonName: "Netherlands",
    cca3: "NLD",
  },
  NORWAY: {
    officialName: "Norway",
    commonName: "Norway",
    cca3: "NOR",
  },
  NEPAL: {
    officialName: "Nepal",
    commonName: "Nepal",
    cca3: "NPL",
  },
  NAURU: {
    officialName: "Nauru",
    commonName: "Nauru",
    cca3: "NRU",
  },
  NEW_ZEALAND: {
    officialName: "New Zealand",
    commonName: "New Zealand",
    cca3: "NZL",
  },
  OMAN: {
    officialName: "Oman",
    commonName: "Oman",
    cca3: "OMN",
  },
  PAKISTAN: {
    officialName: "Pakistan",
    commonName: "Pakistan",
    cca3: "PAK",
  },
  PANAMA: {
    officialName: "Panama",
    commonName: "Panama",
    cca3: "PAN",
  },
  PITCAIRN_ISLANDS: {
    officialName: "Pitcairn",
    commonName: "Pitcairn Islands",
    cca3: "PCN",
  },
  PERU: {
    officialName: "Peru",
    commonName: "Peru",
    cca3: "PER",
  },
  PHILIPPINES: {
    officialName: "Philippines",
    commonName: "Philippines",
    cca3: "PHL",
  },
  PALAU: {
    officialName: "Palau",
    commonName: "Palau",
    cca3: "PLW",
  },
  PAPUA_NEW_GUINEA: {
    officialName: "Papua New Guinea",
    commonName: "Papua New Guinea",
    cca3: "PNG",
  },
  POLAND: {
    officialName: "Poland",
    commonName: "Poland",
    cca3: "POL",
  },
  PUERTO_RICO: {
    officialName: "Puerto Rico",
    commonName: "Puerto Rico",
    cca3: "PRI",
  },
  NORTH_KOREA: {
    officialName: "Korea (Democratic People's Republic of)",
    commonName: "North Korea",
    cca3: "PRK",
  },
  PORTUGAL: {
    officialName: "Portugal",
    commonName: "Portugal",
    cca3: "PRT",
  },
  PARAGUAY: {
    officialName: "Paraguay",
    commonName: "Paraguay",
    cca3: "PRY",
  },
  PALESTINE: {
    officialName: "Palestine, State of",
    commonName: "Palestine",
    cca3: "PSE",
  },
  FRENCH_POLYNESIA: {
    officialName: "French Polynesia",
    commonName: "French Polynesia",
    cca3: "PYF",
  },
  QATAR: {
    officialName: "Qatar",
    commonName: "Qatar",
    cca3: "QAT",
  },
  REUNION: {
    officialName: "Reunion",
    commonName: "Reunion",
    cca3: "REU",
  },
  ROMANIA: {
    officialName: "Romania",
    commonName: "Romania",
    cca3: "ROU",
  },
  RUSSIA: {
    officialName: "Russian Federation",
    commonName: "Russia",
    cca3: "RUS",
  },
  RWANDA: {
    officialName: "Rwanda",
    commonName: "Rwanda",
    cca3: "RWA",
  },
  SAUDI_ARABIA: {
    officialName: "Saudi Arabia",
    commonName: "Saudi Arabia",
    cca3: "SAU",
  },
  SUDAN: {
    officialName: "Sudan",
    commonName: "Sudan",
    cca3: "SDN",
  },
  SENEGAL: {
    officialName: "Senegal",
    commonName: "Senegal",
    cca3: "SEN",
  },
  SINGAPORE: {
    officialName: "Singapore",
    commonName: "Singapore",
    cca3: "SGP",
  },
  SOUTH_GEORGIA: {
    officialName: "South Georgia and the South Sandwich Islands",
    commonName: "South Georgia",
    cca3: "SGS",
  },
  SVALBARD_AND_JAN_MAYEN: {
    officialName: "Svalbard and Jan Mayen",
    commonName: "Svalbard And Jan Mayen",
    cca3: "SJM",
  },
  SOLOMON_ISLANDS: {
    officialName: "Solomon Islands",
    commonName: "Solomon Islands",
    cca3: "SLB",
  },
  SIERRA_LEONE: {
    officialName: "Sierra Leone",
    commonName: "Sierra Leone",
    cca3: "SLE",
  },
  EL_SALVADOR: {
    officialName: "El Salvador",
    commonName: "El Salvador",
    cca3: "SLV",
  },
  SAN_MARINO: {
    officialName: "San Marino",
    commonName: "San Marino",
    cca3: "SMR",
  },
  SOMALIA: {
    officialName: "Somalia",
    commonName: "Somalia",
    cca3: "SOM",
  },
  SAINT_PIERRE_AND_MIQUELON: {
    officialName: "Saint Pierre and Miquelon",
    commonName: "Saint Pierre And Miquelon",
    cca3: "SPM",
  },
  SERBIA: {
    officialName: "Serbia",
    commonName: "Serbia",
    cca3: "SRB",
  },
  SOUTH_SUDAN: {
    officialName: "South Sudan",
    commonName: "South Sudan",
    cca3: "SSD",
  },
  SAO_TOME_AND_PRINCIPE: {
    officialName: "Sao Tome and Principe",
    commonName: "Sao Tome And Principe",
    cca3: "STP",
  },
  SURINAME: {
    officialName: "Suriname",
    commonName: "Suriname",
    cca3: "SUR",
  },
  SLOVAKIA: {
    officialName: "Slovakia",
    commonName: "Slovakia",
    cca3: "SVK",
  },
  SLOVENIA: {
    officialName: "Slovenia",
    commonName: "Slovenia",
    cca3: "SVN",
  },
  SWEDEN: {
    officialName: "Sweden",
    commonName: "Sweden",
    cca3: "SWE",
  },
  ESWATINI: {
    officialName: "Eswatini",
    commonName: "Eswatini",
    cca3: "SWZ",
  },
  SINT_MAARTEN: {
    officialName: "Sint Maarten (Dutch part)",
    commonName: "Sint Maarten",
    cca3: "SXM",
  },
  SEYCHELLES: {
    officialName: "Seychelles",
    commonName: "Seychelles",
    cca3: "SYC",
  },
  SYRIA: {
    officialName: "Syrian Arab Republic",
    commonName: "Syria",
    cca3: "SYR",
  },
  TURKS_AND_CAICOS_ISLANDS: {
    officialName: "Turks and Caicos Islands",
    commonName: "Turks And Caicos Islands",
    cca3: "TCA",
  },
  CHAD: {
    officialName: "Chad",
    commonName: "Chad",
    cca3: "TCD",
  },
  TOGO: {
    officialName: "Togo",
    commonName: "Togo",
    cca3: "TGO",
  },
  THAILAND: {
    officialName: "Thailand",
    commonName: "Thailand",
    cca3: "THA",
  },
  TAJIKISTAN: {
    officialName: "Tajikistan",
    commonName: "Tajikistan",
    cca3: "TJK",
  },
  TOKELAU: {
    officialName: "Tokelau",
    commonName: "Tokelau",
    cca3: "TKL",
  },
  TURKMENISTAN: {
    officialName: "Turkmenistan",
    commonName: "Turkmenistan",
    cca3: "TKM",
  },
  TIMORLESTE: {
    officialName: "Timor-Leste",
    commonName: "Timorleste",
    cca3: "TLS",
  },
  TONGA: {
    officialName: "Tonga",
    commonName: "Tonga",
    cca3: "TON",
  },
  TRINIDAD_AND_TOBAGO: {
    officialName: "Trinidad and Tobago",
    commonName: "Trinidad And Tobago",
    cca3: "TTO",
  },
  TUNISIA: {
    officialName: "Tunisia",
    commonName: "Tunisia",
    cca3: "TUN",
  },
  TURKIYE: {
    officialName: "Turkey",
    commonName: "Turkiye",
    cca3: "TUR",
  },
  TUVALU: {
    officialName: "Tuvalu",
    commonName: "Tuvalu",
    cca3: "TUV",
  },
  TAIWAN: {
    officialName: "Taiwan, Province of China",
    commonName: "Taiwan",
    cca3: "TWN",
  },
  TANZANIA: {
    officialName: "Tanzania, United Republic of",
    commonName: "Tanzania",
    cca3: "TZA",
  },
  UGANDA: {
    officialName: "Uganda",
    commonName: "Uganda",
    cca3: "UGA",
  },
  UKRAINE: {
    officialName: "Ukraine",
    commonName: "Ukraine",
    cca3: "UKR",
  },
  UNITED_STATES_MINOR_OUTLYING_ISLANDS: {
    officialName: "United States Minor Outlying Islands",
    commonName: "United States Minor Outlying Islands",
    cca3: "UMI",
  },
  URUGUAY: {
    officialName: "Uruguay",
    commonName: "Uruguay",
    cca3: "URY",
  },
  UNITED_STATES: {
    officialName: "United States of America",
    commonName: "United States",
    cca3: "USA",
  },
  UZBEKISTAN: {
    officialName: "Uzbekistan",
    commonName: "Uzbekistan",
    cca3: "UZB",
  },
  UNITED_NATIONS: {
    officialName: "United Nations",
    commonName: "United Nations",
    cca3: "UNO",
  },
  VATICAN_CITY: {
    officialName: "Holy See",
    commonName: "Vatican City",
    cca3: "VAT",
  },
  SAINT_VINCENT_AND_THE_GRENADINES: {
    officialName: "Saint Vincent and the Grenadines",
    commonName: "Saint Vincent And The Grenadines",
    cca3: "VCT",
  },
  VENEZUELA: {
    officialName: "Venezuela (Bolivarian Republic of)",
    commonName: "Venezuela",
    cca3: "VEN",
  },
  BRITISH_VIRGIN_ISLANDS: {
    officialName: "Virgin Islands (British)",
    commonName: "British Virgin Islands",
    cca3: "VGB",
  },
  UNITED_STATES_VIRGIN_ISLANDS: {
    officialName: "Virgin Islands (U.S.)",
    commonName: "United States Virgin Islands",
    cca3: "VIR",
  },
  VIETNAM: {
    officialName: "Viet Nam",
    commonName: "Vietnam",
    cca3: "VNM",
  },
  VANUATU: {
    officialName: "Vanuatu",
    commonName: "Vanuatu",
    cca3: "VUT",
  },
  WALLIS_AND_FUTUNA: {
    officialName: "Wallis and Futuna",
    commonName: "Wallis And Futuna",
    cca3: "WLF",
  },
  SAMOA: {
    officialName: "Samoa",
    commonName: "Samoa",
    cca3: "WSM",
  },
  YEMEN: {
    officialName: "Yemen",
    commonName: "Yemen",
    cca3: "YEM",
  },
  SOUTH_AFRICA: {
    officialName: "South Africa",
    commonName: "South Africa",
    cca3: "ZAF",
  },
  ZAMBIA: {
    officialName: "Zambia",
    commonName: "Zambia",
    cca3: "ZMB",
  },
  ZIMBABWE: {
    officialName: "Zimbabwe",
    commonName: "Zimbabwe",
    cca3: "ZWE",
  },
  COUNCIL_OF_EUROPE: {
    officialName: "Council of Europe",
    commonName: "Council Of Europe",
    cca3: "XCE",
  },
  INTERPOL: {
    officialName: "International Criminal Police Organization",
    commonName: "Interpol",
    cca3: "XPO",
  },
  SMOM: {
    officialName: "Sovereign Military Order of Malta",
    commonName: "Smom",
    cca3: "XOM",
  }
} as const;