import { v4 } from 'uuid';

import { REDIRECT_URL } from '../foundation/constants/network.js';
import type {
  SelfApp,
  SelfAppBuilderConfig,
  SelfAppDisclosureConfig,
  DisclosurePresetName,
} from '../foundation/types/app.js';
import { validateUserId } from '../circuits/userId.js';
import { formatEndpoint } from '../crypto/scope.js';
import { resolveDisclosures } from './presets.js';

function inferEndpointType(endpoint: string): 'https' | 'celo' {
  if (endpoint.startsWith('0x')) return 'celo';
  return 'https';
}

function inferUserIdType(userId: string): 'hex' | 'uuid' {
  if (userId.startsWith('0x')) return 'hex';
  return 'uuid';
}

export class SelfAppBuilder {
  private config: SelfApp;

  constructor(config: SelfAppBuilderConfig | Partial<SelfApp>) {
    if (!config.appName) {
      throw new Error('appName is required — provide the display name for your app');
    }
    if (!config.scope) {
      throw new Error(
        'scope is required — this must match the scopeSeed used in your contract deployment',
      );
    }
    if (!config.endpoint) {
      throw new Error(
        'endpoint is required — provide your verification URL (https://...) or contract address (0x...)',
      );
    }
    const nonAsciiScopeMatch = config.scope.match(/[^\x00-\x7F]/);
    if (nonAsciiScopeMatch) {
      throw new Error(
        `Scope must contain only ASCII characters (0-127). Found '${nonAsciiScopeMatch[0]}' in '${config.scope}'`,
      );
    }
    const nonAsciiEndpointMatch = config.endpoint.match(/[^\x00-\x7F]/);
    if (nonAsciiEndpointMatch) {
      throw new Error(
        `Endpoint must contain only ASCII characters (0-127). Found '${nonAsciiEndpointMatch[0]}' in '${config.endpoint}'`,
      );
    }
    if (config.scope.length > 31) {
      throw new Error(
        `Scope must be at most 31 characters, got ${config.scope.length} characters: '${config.scope}'`,
      );
    }
    const formattedEndpoint = formatEndpoint(config.endpoint);
    if (formattedEndpoint.length > 496) {
      throw new Error(
        `Endpoint must be less than 496 characters, current endpoint: ${formattedEndpoint}, length: ${formattedEndpoint.length}`,
      );
    }

    // Auto-generate userId if not provided
    const userId = config.userId || v4();

    // Infer types from values, but never override explicit config
    const endpointType = config.endpointType ?? inferEndpointType(config.endpoint);
    const userIdType = config.userIdType ?? inferUserIdType(userId);

    if (endpointType === 'https' && !config.endpoint.startsWith('https://')) {
      const suggestion = config.endpoint.startsWith('http://')
        ? ` Did you mean '${config.endpoint.replace('http://', 'https://')}'?`
        : '';
      throw new Error(`endpoint must start with https://.${suggestion}`);
    }
    if (endpointType === 'celo' && !config.endpoint.startsWith('0x')) {
      throw new Error(
        `Endpoint must be a valid contract address (starting with 0x) for endpointType 'celo'. Got: '${config.endpoint}'`,
      );
    }
    if (
      config.endpoint &&
      (config.endpoint.includes('localhost') || config.endpoint.includes('127.0.0.1'))
    ) {
      throw new Error(
        `localhost endpoints are not allowed. Use a publicly accessible URL or contract address. Got: '${config.endpoint}'`,
      );
    }

    let processedUserId = userId;
    if (userIdType === 'hex') {
      if (!processedUserId.startsWith('0x')) {
        throw new Error('userId as hex must start with 0x');
      }
      processedUserId = processedUserId.slice(2);
    }
    if (!validateUserId(processedUserId, userIdType)) {
      throw new Error('userId must be a valid UUID or address');
    }

    // Resolve disclosure presets
    const disclosures = resolveDisclosures(
      config.disclosures as SelfAppBuilderConfig['disclosures'],
    );

    this.config = {
      sessionId: v4(),
      devMode: false,
      header: '',
      logoBase64: '',
      deeplinkCallback: '',
      chainID: endpointType === 'staging_celo' ? 11142220 : 42220,
      version: config.version ?? 2,
      userDefinedData: '',
      selfDefinedData: '',
      ...config,
      // These must come after spread to ensure our processed values win
      userId: processedUserId,
      endpointType,
      userIdType,
      disclosures,
    } as SelfApp;
  }

  build(): SelfApp {
    return this.config;
  }

  static forContract(config: {
    appName: string;
    contractAddress: string;
    scopeSeed: string;
    endpointType?: 'celo' | 'staging_celo';
    disclosures?: SelfAppDisclosureConfig | DisclosurePresetName;
    userId?: string;
    logoBase64?: string;
    header?: string;
  }): SelfAppBuilder {
    return new SelfAppBuilder({
      appName: config.appName,
      endpoint: config.contractAddress,
      scope: config.scopeSeed,
      endpointType: config.endpointType ?? 'celo',
      ...(config.disclosures !== undefined && { disclosures: config.disclosures }),
      ...(config.userId !== undefined && { userId: config.userId }),
      ...(config.logoBase64 !== undefined && { logoBase64: config.logoBase64 }),
      ...(config.header !== undefined && { header: config.header }),
    });
  }

  static forBackend(config: {
    appName: string;
    endpoint: string;
    scope: string;
    disclosures?: SelfAppDisclosureConfig | DisclosurePresetName;
    userId?: string;
    logoBase64?: string;
    header?: string;
  }): SelfAppBuilder {
    return new SelfAppBuilder({
      appName: config.appName,
      endpoint: config.endpoint,
      scope: config.scope,
      endpointType: 'https',
      ...(config.disclosures !== undefined && { disclosures: config.disclosures }),
      ...(config.userId !== undefined && { userId: config.userId }),
      ...(config.logoBase64 !== undefined && { logoBase64: config.logoBase64 }),
      ...(config.header !== undefined && { header: config.header }),
    });
  }
}

export function getUniversalLink(selfApp: SelfApp): string {
  return `${REDIRECT_URL}?selfApp=${encodeURIComponent(JSON.stringify(selfApp))}`;
}
