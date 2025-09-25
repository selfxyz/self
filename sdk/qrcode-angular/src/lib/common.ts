import { v4 } from 'uuid';

export type EndpointType = 'https' | 'celo' | 'staging_celo' | 'staging_https';
export type UserIdType = 'hex' | 'uuid';

export type Country3LetterCode = (typeof countries)[keyof typeof countries];

export const WS_DB_RELAYER = 'wss://websocket.self.xyz';
export const REDIRECT_URL = 'https://redirect.self.xyz';

export const countries = {
  AFGHANISTAN: 'AFG',
  ALAND_ISLANDS: 'ALA',
  ALBANIA: 'ALB',
  ALGERIA: 'DZA',
  AMERICAN_SAMOA: 'ASM',
  ANDORRA: 'AND',
  ANGOLA: 'AGO',
  ANGUILLA: 'AIA',
  ANTARCTICA: 'ATA',
  ANTIGUA_AND_BARBUDA: 'ATG',
  ARGENTINA: 'ARG',
  ARMENIA: 'ARM',
  ARUBA: 'ABW',
  AUSTRALIA: 'AUS',
  AUSTRIA: 'AUT',
  AZERBAIJAN: 'AZE',
  BAHAMAS: 'BHS',
  BAHRAIN: 'BHR',
  BANGLADESH: 'BGD',
  BARBADOS: 'BRB',
  BELARUS: 'BLR',
  BELGIUM: 'BEL',
  BELIZE: 'BLZ',
  BENIN: 'BEN',
  BERMUDA: 'BMU',
  BHUTAN: 'BTN',
  BOLIVIA: 'BOL',
  BONAIRE_SINT_EUSTATIUS_AND_SABA: 'BES',
  BOSNIA_AND_HERZEGOVINA: 'BIH',
  BOTSWANA: 'BWA',
  BOUVET_ISLAND: 'BVT',
  BRAZIL: 'BRA',
  BRITISH_INDIAN_OCEAN_TERRITORY: 'IOT',
  BRUNEI: 'BRN',
  BULGARIA: 'BGR',
  BURKINA_FASO: 'BFA',
  BURUNDI: 'BDI',
  CAPE_VERDE: 'CPV',
  CAMBODIA: 'KHM',
  CAMEROON: 'CMR',
  CANADA: 'CAN',
  CAYMAN_ISLANDS: 'CYM',
  CENTRAL_AFRICAN_REPUBLIC: 'CAF',
  CHAD: 'TCD',
  CHILE: 'CHL',
  CHINA: 'CHN',
  CHRISTMAS_ISLAND: 'CXR',
  COCOS_ISLANDS: 'CCK',
  COLOMBIA: 'COL',
  COMOROS: 'COM',
  CONGO: 'COG',
  DR_CONGO: 'COD',
  COOK_ISLANDS: 'COK',
  COSTA_RICA: 'CRI',
  IVORY_COAST: 'CIV',
  CROATIA: 'HRV',
  CUBA: 'CUB',
  CURACAO: 'CUW',
  CYPRUS: 'CYP',
  CZECH_REPUBLIC: 'CZE',
  DENMARK: 'DNK',
  DJIBOUTI: 'DJI',
  DOMINICA: 'DMA',
  DOMINICAN_REPUBLIC: 'DOM',
  ECUADOR: 'ECU',
  EGYPT: 'EGY',
  EL_SALVADOR: 'SLV',
  EQUATORIAL_GUINEA: 'GNQ',
  ERITREA: 'ERI',
  ESTONIA: 'EST',
  ESWATINI: 'SWZ',
  ETHIOPIA: 'ETH',
  FALKLAND_ISLANDS: 'FLK',
  FAROE_ISLANDS: 'FRO',
  FIJI: 'FJI',
  FINLAND: 'FIN',
  FRANCE: 'FRA',
  FRENCH_GUIANA: 'GUF',
  FRENCH_POLYNESIA: 'PYF',
  FRENCH_SOUTHERN_TERRITORIES: 'ATF',
  GABON: 'GAB',
  GAMBIA: 'GMB',
  GEORGIA: 'GEO',
  GERMANY: 'D<<',
  GHANA: 'GHA',
  GIBRALTAR: 'GIB',
  GREECE: 'GRC',
  GREENLAND: 'GRL',
  GRENADA: 'GRD',
  GUADELOUPE: 'GLP',
  GUAM: 'GUM',
  GUATEMALA: 'GTM',
  GUERNSEY: 'GGY',
  GUINEA: 'GIN',
  GUINEA_BISSAU: 'GNB',
  GUYANA: 'GUY',
  HAITI: 'HTI',
  HEARD_ISLAND_AND_MCDONALD_ISLANDS: 'HMD',
  VATICAN_CITY: 'VAT',
  HONDURAS: 'HND',
  HONG_KONG: 'HKG',
  HUNGARY: 'HUN',
  ICELAND: 'ISL',
  INDIA: 'IND',
  INDONESIA: 'IDN',
  IRAN: 'IRN',
  IRAQ: 'IRQ',
  IRELAND: 'IRL',
  ISLE_OF_MAN: 'IMN',
  ISRAEL: 'ISR',
  ITALY: 'ITA',
  JAMAICA: 'JAM',
  JAPAN: 'JPN',
  JERSEY: 'JEY',
  JORDAN: 'JOR',
  KAZAKHSTAN: 'KAZ',
  KENYA: 'KEN',
  KIRIBATI: 'KIR',
  NORTH_KOREA: 'PRK',
  SOUTH_KOREA: 'KOR',
  KUWAIT: 'KWT',
  KYRGYZSTAN: 'KGZ',
  LAOS: 'LAO',
  LATVIA: 'LVA',
  LEBANON: 'LBN',
  LESOTHO: 'LSO',
  LIBERIA: 'LBR',
  LIBYA: 'LBY',
  LIECHTENSTEIN: 'LIE',
  LITHUANIA: 'LTU',
  LUXEMBOURG: 'LUX',
  MACAO: 'MAC',
  MADAGASCAR: 'MDG',
  MALAWI: 'MWI',
  MALAYSIA: 'MYS',
  MALDIVES: 'MDV',
  MALI: 'MLI',
  MALTA: 'MLT',
  MARSHALL_ISLANDS: 'MHL',
  MARTINIQUE: 'MTQ',
  MAURITANIA: 'MRT',
  MAURITIUS: 'MUS',
  MAYOTTE: 'MYT',
  MEXICO: 'MEX',
  MICRONESIA: 'FSM',
  MOLDOVA: 'MDA',
  MONACO: 'MCO',
  MONGOLIA: 'MNG',
  MONTENEGRO: 'MNE',
  MONTSERRAT: 'MSR',
  MOROCCO: 'MAR',
  MOZAMBIQUE: 'MOZ',
  MYANMAR: 'MMR',
  NAMIBIA: 'NAM',
  NAURU: 'NRU',
  NEPAL: 'NPL',
  NETHERLANDS: 'NLD',
  NEW_CALEDONIA: 'NCL',
  NEW_ZEALAND: 'NZL',
  NICARAGUA: 'NIC',
  NIGER: 'NER',
  NIGERIA: 'NGA',
  NIUE: 'NIU',
  NORFOLK_ISLAND: 'NFK',
  NORTH_MACEDONIA: 'MKD',
  NORTHERN_MARIANA_ISLANDS: 'MNP',
  NORWAY: 'NOR',
  OMAN: 'OMN',
  PAKISTAN: 'PAK',
  PALAU: 'PLW',
  PALESTINE: 'PSE',
  PANAMA: 'PAN',
  PAPUA_NEW_GUINEA: 'PNG',
  PARAGUAY: 'PRY',
  PERU: 'PER',
  PHILIPPINES: 'PHL',
  PITCAIRN: 'PCN',
  POLAND: 'POL',
  PORTUGAL: 'PRT',
  PUERTO_RICO: 'PRI',
  QATAR: 'QAT',
  REUNION: 'REU',
  ROMANIA: 'ROU',
  RUSSIA: 'RUS',
  RWANDA: 'RWA',
  SAINT_BARTHELEMY: 'BLM',
  SAINT_HELENA_ASCENSION_AND_TRISTAN_DA_CUNHA: 'SHN',
  SAINT_KITTS_AND_NEVIS: 'KNA',
  SAINT_LUCIA: 'LCA',
  SAINT_MARTIN: 'MAF',
  SAINT_PIERRE_AND_MIQUELON: 'SPM',
  SAINT_VINCENT_AND_THE_GRENADINES: 'VCT',
  SAMOA: 'WSM',
  SAN_MARINO: 'SMR',
  SAO_TOME_AND_PRINCIPE: 'STP',
  SAUDI_ARABIA: 'SAU',
  SENEGAL: 'SEN',
  SERBIA: 'SRB',
  SEYCHELLES: 'SYC',
  SIERRA_LEONE: 'SLE',
  SINGAPORE: 'SGP',
  SINT_MAARTEN: 'SXM',
  SLOVAKIA: 'SVK',
  SLOVENIA: 'SVN',
  SOLOMON_ISLANDS: 'SLB',
  SOMALIA: 'SOM',
  SOUTH_AFRICA: 'ZAF',
  SOUTH_GEORGIA_AND_THE_SOUTH_SANDWICH_ISLANDS: 'SGS',
  SOUTH_SUDAN: 'SSD',
  SPAIN: 'ESP',
  SRI_LANKA: 'LKA',
  SUDAN: 'SDN',
  SURINAME: 'SUR',
  SVALBARD_AND_JAN_MAYEN: 'SJM',
  SWEDEN: 'SWE',
  SWITZERLAND: 'CHE',
  SYRIAN_ARAB_REPUBLIC: 'SYR',
  TAIWAN: 'TWN',
  TAJIKISTAN: 'TJK',
  TANZANIA: 'TZA',
  THAILAND: 'THA',
  TIMOR_LESTE: 'TLS',
  TOGO: 'TGO',
  TOKELAU: 'TKL',
  TONGA: 'TON',
  TRINIDAD_AND_TOBAGO: 'TTO',
  TUNISIA: 'TUN',
  TURKEY: 'TUR',
  TURKMENISTAN: 'TKM',
  TURKS_AND_CAICOS_ISLANDS: 'TCA',
  TUVALU: 'TUV',
  UGANDA: 'UGA',
  UKRAINE: 'UKR',
  UNITED_ARAB_EMIRATES: 'ARE',
  UNITED_KINGDOM: 'GBR',
  UNITED_STATES: 'USA',
  UNITED_STATES_MINOR_OUTLYING_ISLANDS: 'UMI',
  URUGUAY: 'URY',
  UZBEKISTAN: 'UZB',
  VANUATU: 'VUT',
  VENEZUELA: 'VEN',
  VIET_NAM: 'VNM',
  VIRGIN_ISLANDS_BRITISH: 'VGB',
  VIRGIN_ISLANDS_US: 'VIR',
  WALLIS_AND_FUTUNA: 'WLF',
  WESTERN_SAHARA: 'ESH',
  YEMEN: 'YEM',
  ZAMBIA: 'ZMB',
  ZIMBABWE: 'ZWE',
  EUROPEAN_UNION: 'EUE',
  UNITED_NATIONS: 'UNO',
  COUNCIL_OF_EUROPE: 'XCE',
  INTERPOL: 'XPO',
  SMOM: 'XOM',
} as const;

export interface SelfAppDisclosureConfig {
  issuing_state?: boolean;
  name?: boolean;
  passport_number?: boolean;
  nationality?: boolean;
  date_of_birth?: boolean;
  gender?: boolean;
  expiry_date?: boolean;
  ofac?: boolean;
  excludedCountries?: Country3LetterCode[];
  minimumAge?: number;
}

export interface SelfApp {
  appName: string;
  logoBase64: string;
  endpointType: EndpointType;
  endpoint: string;
  deeplinkCallback: string;
  header: string;
  scope: string;
  sessionId: string;
  userId: string;
  userIdType: UserIdType;
  devMode: boolean;
  disclosures: SelfAppDisclosureConfig;
  version: number;
  chainID: 42220 | 11142220;
  userDefinedData: string;
}

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
  'D<<': 'Germany', // Bundesrepublik Deutschland uses this in passports instead of DEU
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
};

export function formatEndpoint(endpoint: string): string {
  if (!endpoint) return '';
  return endpoint.replace(/^https?:\/\//, '').split('/')[0];
}

export function validateUserId(userId: string, type: UserIdType): boolean {
  switch (type) {
    case 'hex':
      return /^[0-9A-Fa-f]+$/.test(userId);
    case 'uuid':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId
      );
    default:
      return false;
  }
}

export class SelfAppBuilder {
  private config: SelfApp;

  constructor(config: Partial<SelfApp>) {
    if (!config.appName) {
      throw new Error('appName is required');
    }
    if (!config.scope) {
      throw new Error('scope is required');
    }
    if (!config.endpoint) {
      throw new Error('endpoint is required');
    }
    // Check if scope and endpoint contain only ASCII characters
    if (!/^[\x00-\x7F]*$/.test(config.scope)) {
      throw new Error('Scope must contain only ASCII characters (0-127)');
    }
    if (!/^[\x00-\x7F]*$/.test(config.endpoint)) {
      throw new Error('Endpoint must contain only ASCII characters (0-127)');
    }
    if (config.scope.length > 31) {
      throw new Error('Scope must be less than 31 characters');
    }
    const formattedEndpoint = formatEndpoint(config.endpoint);
    if (formattedEndpoint.length > 496) {
      throw new Error(
        `Endpoint must be less than 496 characters, current endpoint: ${formattedEndpoint}, length: ${formattedEndpoint.length}`
      );
    }
    if (!config.userId) {
      throw new Error('userId is required');
    }
    if (config.endpointType === 'https' && !config.endpoint.startsWith('https://')) {
      throw new Error('endpoint must start with https://');
    }
    if (config.endpointType === 'celo' && !config.endpoint.startsWith('0x')) {
      throw new Error('endpoint must be a valid address');
    }
    // Validate that localhost endpoints are not allowed
    if (
      config.endpoint &&
      (config.endpoint.includes('localhost') || config.endpoint.includes('127.0.0.1'))
    ) {
      throw new Error('localhost endpoints are not allowed');
    }
    if (config.userIdType === 'hex') {
      if (!config.userId.startsWith('0x')) {
        throw new Error('userId as hex must start with 0x');
      }
      config.userId = config.userId.slice(2);
    }
    if (!validateUserId(config.userId, config.userIdType ?? 'uuid')) {
      throw new Error('userId must be a valid UUID or address');
    }

    this.config = {
      sessionId: v4(),
      userIdType: 'uuid',
      devMode: false,
      endpointType: 'https',
      header: '',
      logoBase64: '',
      deeplinkCallback: '',
      disclosures: {},
      chainID: config.endpointType === 'staging_celo' ? 11142220 : 42220,
      version: config.version ?? 2,
      userDefinedData: '',
      ...config,
    } as SelfApp;
  }

  build(): SelfApp {
    return this.config;
  }
}

export function getUniversalLink(selfApp: SelfApp): string {
  return `${REDIRECT_URL}?selfApp=${encodeURIComponent(JSON.stringify(selfApp))}`;
}
