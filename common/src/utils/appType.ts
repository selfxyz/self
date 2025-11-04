import { v4 } from 'uuid';

import { REDIRECT_URL } from '../constants/constants.js';
import type { Country3LetterCode } from '../constants/countries.js';
import type { UserIdType } from './circuits/uuid.js';
import { validateUserId } from './circuits/uuid.js';
import { formatEndpoint } from './scope.js';

export interface DeferredLinkingTokenResponse {
  campaign_id: string;
  campaign_user_id: string;
  self_app: string; // SelfApp is serialized as a string
}
export type EndpointType = 'https' | 'celo' | 'staging_celo' | 'staging_https';

export type Mode = 'register' | 'dsc' | 'vc_and_disclose';

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
  selfDefinedData: string;
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
  excludedCountries?: Country3LetterCode[];
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
      selfDefinedData: '',
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
