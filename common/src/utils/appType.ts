import { UserIdType } from "./circuits/uuid";

export type Mode = 'register' | 'dsc' | 'vc_and_disclose';
export type EndpointType = 'https' | 'celo';

import { v4 } from 'uuid';

// SelfAppType
export interface SelfAppPartial {
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
}

export interface SelfApp extends SelfAppPartial {
  args: ArgumentsDisclose;
}

export interface ArgumentsDisclose {
  disclosureOptions: DisclosureOptions;
}

type DisclosureBoolKeys = 'ofac'
type DisclosureBoolOption = {
  enabled: boolean;
  key: DisclosureBoolKeys
}

type DisclosureMatchKeys = 'nationality' | 'minimumAge'
export interface DisclosureMatchOption<T = DisclosureMatchKeys> {
  enabled: boolean;
  key: T;
  value: string;
}

type DisclosureListKeys = 'excludedCountries'
interface DisclosureListOption {
  enabled: boolean;
  key: DisclosureListKeys;
  value: string[];
}

export type DisclosureOption = DisclosureBoolOption | DisclosureMatchOption | DisclosureListOption
export type DisclosureAttributes = DisclosureBoolKeys | DisclosureMatchKeys | DisclosureListKeys
export type DisclosureOptions = Array<DisclosureOption>

export type GetDisclosure<T extends DisclosureAttributes> = T extends DisclosureMatchKeys ? DisclosureMatchOption : T extends DisclosureListKeys ? DisclosureListOption : DisclosureBoolOption

// {"appName": "Mock App2", "args": {"disclosureOptions": [[Object]]}, "devMode": false, "endpoint": "https://mock-app2.com", "endpointType": "https", "header": "", "logoBase64": "", "scope": "scope", "sessionId": "05ce9b3f-cf20-4eca-8bf1-df2694967787", "userId": "06e946f1-485c-4af4-97c4-74a61cf47724", "userIdType": "uuid"}
export class SelfAppBuilder {
  appName: string;
  logoBase64: string;
  scope: string;
  sessionId: string;
  userId: string;
  userIdType: UserIdType;
  devMode: boolean;
  endpointType: EndpointType;
  endpoint: string;
  header: string;
  args: ArgumentsDisclose;

  constructor(appName: string, scope: string, endpoint: string) {
    this.appName = appName;
    this.scope = scope;
    this.args = {
      disclosureOptions: []
    };
    this.header = '';
    this.endpoint = endpoint;
    this.sessionId = v4();
    this.logoBase64 = '';
    this.userId = '';
    this.userIdType = 'uuid';
    this.devMode = false;
    this.endpointType = 'https';
  }

  setLogoBase64(logoBase64: string) {
    this.logoBase64 = logoBase64;
    return this;
  }

  setUserId(userId: string) {
    this.userId = userId;
    return this;
  }

  setEndpointType(endpointType: EndpointType) {
    this.endpointType = endpointType;
    return this;
  }

  setEndpoint(endpoint: string) {
    this.endpoint = endpoint;
    return this;
  }

  setUserIdType(userIdType: UserIdType) {
    this.userIdType = userIdType;
    return this;
  }

  setDevMode(devMode: boolean) {
    this.devMode = devMode;
    return this;
  }

  minimumAge(age: number) {
    this.args.disclosureOptions.push({
      enabled: true,
      key: 'minimumAge',
      value: age.toString()
    });
    return this;
  }

  nationality(nationality: string) {
    this.args.disclosureOptions.push({
      enabled: true,
      key: 'nationality',
      value: nationality
    });
    return this;
  }

  ofac(ofac: boolean) {
    this.args.disclosureOptions.push({
      enabled: true,
      key: 'ofac',
    });
    return this;
  }

  excludedCountries(countries: string[]) {
    this.args.disclosureOptions.push({
      enabled: true,
      key: 'excludedCountries',
      value: countries
    });
    return this;
  }

  build(): SelfApp {
    if (!this.appName) {
      throw new Error('appName is required');
    }
    if (!this.scope) {
      throw new Error('scope is required');
    }
    if (!this.sessionId) {
      throw new Error('sessionId is required');
    }
    if (!this.endpoint) {
      throw new Error('endpoint is required');
    }
    if (this.endpointType === 'https' && !this.endpoint.startsWith('https://')) {
      throw new Error('endpoint must start with https://');
    }
    if (this.endpointType === 'celo' && !this.endpoint.startsWith('0x')) {
      throw new Error('endpoint must be a valid address');
    }

    return {
      appName: this.appName,
      logoBase64: this.logoBase64,
      scope: this.scope,
      sessionId: this.sessionId,
      userId: this.userId,
      userIdType: this.userIdType,
      devMode: this.devMode,
      endpointType: this.endpointType,
      endpoint: this.endpoint,
      header: this.header,
      args: this.args
    };
  }
}
