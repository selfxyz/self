import { UserIdType, validateUserId } from "./circuits/uuid";

export type Mode = 'register' | 'dsc' | 'vc_and_disclose';
export type EndpointType = 'https' | 'celo' | 'staging_celo' | 'staging_https';

import { v4 } from 'uuid';
import { CountryCca3, REDIRECT_URL, CountryListKeys, countryList } from "../constants/constants";

export interface SelfAppDisclosureConfig<T extends CountryListKeys | CountryCca3 = CountryCca3> {
  // dg1
  issuing_state?: boolean;
  name?: boolean;
  passport_number?: boolean;
  nationality?: boolean;
  date_of_birth?: boolean;
  gender?: boolean;
  expiry_date?: boolean;
  // custom checks
  ofac?: boolean;
  excludedCountries?: T[];
  minimumAge?: number;
}

export interface SelfApp {
  appName: string;
  logoBase64: string;
  endpointType: EndpointType;
  endpoint: string;
  header: string;
  scope: string;
  sessionId: string;
  userId: string;
  userIdType: UserIdType;
  devMode: boolean;
  disclosures: SelfAppDisclosureConfig<CountryCca3>;
}

export class SelfAppBuilder {
  private config: SelfApp;

  constructor(config: Partial<SelfApp> & { disclosures?: SelfAppDisclosureConfig<CountryListKeys> }) {
    if (!config.appName) {
      throw new Error('appName is required');
    }
    if (!config.scope) {
      throw new Error('scope is required');
    }
    if (!config.endpoint) {
      throw new Error('endpoint is required');
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
    if (config.userIdType === 'hex') {
      if (!config.userId.startsWith('0x')) {
        throw new Error('userId as hex must start with 0x');
      }
      config.userId = config.userId.slice(2);
    }
    if (!validateUserId(config.userId, config.userIdType ?? "uuid")) {
      throw new Error('userId must be a valid UUID or address');
    }

    let disclosures: SelfAppDisclosureConfig<CountryCca3> = {
      ...config.disclosures,
      excludedCountries: config.disclosures?.excludedCountries?.map(country => countryList[country].cca3)
    };

    this.config = {
      sessionId: v4(),
      userIdType: 'uuid',
      devMode: false,
      endpointType: 'https',
      header: "",
      logoBase64: "",
      disclosures: disclosures || {},
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