import { UserIdType } from "./circuits/uuid";

export type Mode = 'register' | 'dsc' | 'vc_and_disclose';
export type EndpointType = 'https' | 'celo';

import { v4 } from 'uuid';

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
  disclosures: SelfAppDisclosureConfig;
}

export interface SelfAppDisclosureConfig {
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
  excludedCountries?: string[];
  minimumAge?: number;
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
    if (config.endpointType === 'https' && !config.endpoint.startsWith('https://')) {
      throw new Error('endpoint must start with https://');
    }
    if (config.endpointType === 'celo' && !config.endpoint.startsWith('0x')) {
      throw new Error('endpoint must be a valid address');
    }
    
    this.config = {
      sessionId : v4(),
      userIdType : 'uuid',
      userId: "",
      devMode : false,
      endpointType : 'https',
      header: "",
      logoBase64: "",
      disclosures: {},
      ...config,
    } as SelfApp;
  }

  build(): SelfApp {
    return this.config;
  }
}
