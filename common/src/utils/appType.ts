import { UserIdType, validateUserId } from "./circuits/uuid";

export type Mode = 'register' | 'dsc' | 'vc_and_disclose';
export type EndpointType = 'https' | 'celo' | 'staging_celo' | 'staging_https';

import { v4 } from 'uuid';
import { REDIRECT_URL } from "../constants/constants";
import { Country3LetterCode } from "../constants/countries";
import { formatEndpoint } from "./scope";

export interface SelfApp {
  appName: string;
  logoBase64: string;
  header: string;
  sessionId: string;
  verificationConfig: SelfAppVerificationConfig;
}

export interface SelfAppVerificationConfig {
  endpointType: EndpointType;
  endpoint: string;
  scope: string;
  userIdType: UserIdType;
  userId?: string;
  devMode: boolean;
  disclosureConfig: SelfAppDisclosureConfig;
}

export interface SelfAppDisclosureConfig {
  // dg1
  issuingState?: boolean;
  name?: boolean;
  passportNumber?: boolean;
  nationality?: boolean;
  dateOfBirth?: boolean;
  gender?: boolean;
  expiryDate?: boolean;
  // custom checks
  passportNoOfac?: boolean;
  nameAndDobOfac?: boolean;
  nameAndYobOfac?: boolean;
  excludedCountries?: Country3LetterCode[];
  minimumAge?: number;
}

export class SelfAppBuilder {
  private config: SelfApp;

  constructor(config: Partial<SelfApp>) {
    if (!config.appName) {
      throw new Error('appName is required');
    }
    if (!config.verificationConfig.scope) {
      throw new Error('scope is required');
    }
    if (!config.verificationConfig.endpoint) {
      throw new Error('endpoint is required');
    }
    // Check if scope and endpoint contain only ASCII characters
    if (!/^[\x00-\x7F]*$/.test(config.verificationConfig.scope)) {
      throw new Error("Scope must contain only ASCII characters (0-127)");
    }
    if (!/^[\x00-\x7F]*$/.test(config.verificationConfig.endpoint)) {
      throw new Error("Endpoint must contain only ASCII characters (0-127)");
    }
    if (config.verificationConfig.scope.length > 31) {
      throw new Error("Scope must be less than 31 characters");
    }
    const formattedEndpoint = formatEndpoint(config.verificationConfig.endpoint);
    if (formattedEndpoint.length > 496) {
      throw new Error(`Endpoint must be less than 496 characters, current endpoint: ${formattedEndpoint}, length: ${formattedEndpoint.length}`);
    }
    if (!config.verificationConfig.userId) {
      throw new Error('userId is required');
    }
    if (config.verificationConfig.endpointType === 'https' && !config.verificationConfig.endpoint.startsWith('https://')) {
      throw new Error('endpoint must start with https://');
    }
    if (config.verificationConfig.endpointType === 'celo' && !config.verificationConfig.endpoint.startsWith('0x')) {
      throw new Error('endpoint must be a valid address');
    }
    if (config.verificationConfig.userIdType === 'hex') {
      if (!config.verificationConfig.userId.startsWith('0x')) {
        throw new Error('userId as hex must start with 0x');
      }
      config.verificationConfig.userId = config.verificationConfig.userId.slice(2);
    }
    if (!validateUserId(config.verificationConfig.userId, config.verificationConfig.userIdType ?? "uuid")) {
      throw new Error('userId must be a valid UUID or address');
    }

    this.config = {
      sessionId: v4(),
      verificationConfig: {
        userIdType: 'uuid',
        devMode: false,
        endpointType: 'https',
        ...config.verificationConfig,
      },
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