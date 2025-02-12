import { UserIdType } from "./circuits/uuid";

export type Mode = 'register' | 'dsc' | 'vc_and_disclose';

// SelfAppType
export interface SelfAppPartial {
  appName: string;
  logoBase64: string;
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
interface DisclosureMatchOption<T = DisclosureMatchKeys> {
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


export class SelfAppBuilder {
  appName: string;
  logoBase64: string;
  scope: string;
  sessionId: string;
  userId: string;
  userIdType: UserIdType;
  devMode: boolean;
  args: ArgumentsDisclose;

  constructor(appName: string, scope: string) {
    this.appName = appName;
    this.scope = scope;
  }

  setLogoBase64(logoBase64: string) {
    this.logoBase64 = logoBase64;
    return this;
  }

  setUserId(userId: string) {
    this.userId = userId;
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
  }

  nationality(nationality: string) {
    this.args.disclosureOptions.push({
      enabled: true,
      key: 'nationality',
      value: nationality
    });
  }

  ofac(ofac: boolean) {
    this.args.disclosureOptions.push({
      enabled: true,
      key: 'ofac',
    });
  }

  excludedCountries(countries: string[]) {
    this.args.disclosureOptions.push({
      enabled: true,
      key: 'excludedCountries',
      value: countries
    });
  }

  build(): SelfApp {
    return {
      appName: this.appName,
      logoBase64: this.logoBase64,
      scope: this.scope,
      sessionId: this.sessionId,
      userId: this.userId,
      userIdType: this.userIdType,
      devMode: this.devMode,
      args: this.args
    };
  }
}
