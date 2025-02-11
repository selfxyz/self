import { UserIdType } from "./circuits/uuid";

export type Mode = 'register' | 'dsc' | 'vc_and_disclose';

// SelfAppType
export interface SelfAppPartial {
  appName: string;
  scope: string;
  sessionId: string;
  userId: string;
  userIdType: UserIdType;
  devMode: boolean;
}

export interface SelfApp extends SelfAppPartial {
  args: ArgumentsProveOffChain | ArgumentsProveOnChain | ArgumentsRegister | ArgumentsDisclose;
}

export interface ArgumentsProveOffChain {
  disclosureOptions: DisclosureOptions;
}

export interface ArgumentsProveOnChain {
  disclosureOptions: DisclosureOptions;
  modalServerUrl: string;
  merkleTreeUrl: string;
}

export interface ArgumentsRegister {
  cscaMerkleTreeUrl: string;
  commitmentMerkleTreeUrl: string;
  modalServerUrl: string;
}

export interface ArgumentsDisclose {
  disclosureOptions: DisclosureOptions;
  commitmentMerkleTreeUrl: string;
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
