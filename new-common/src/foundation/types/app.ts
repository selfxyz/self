import type { Country3LetterCode } from '../constants/countries.js';
import type { UserIdType } from './circuit.js';

export type EndpointType = 'https' | 'celo' | 'staging_celo' | 'staging_https';

export type Mode = 'register' | 'dsc' | 'vc_and_disclose';

export interface DeferredLinkingTokenResponse {
  campaign_id: string;
  campaign_user_id: string;
  self_app: string;
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
  selfDefinedData: string;
}

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

export type DisclosurePresetName = 'basic-kyc' | 'age-verification' | 'full-passport' | 'ofac-only';

export interface SelfAppBuilderConfig {
  appName: string;
  scope: string;
  endpoint: string;
  userId?: string;
  sessionId?: string;
  userIdType?: UserIdType;
  devMode?: boolean;
  endpointType?: EndpointType;
  logoBase64?: string;
  header?: string;
  deeplinkCallback?: string;
  disclosures?: SelfAppDisclosureConfig | DisclosurePresetName;
  version?: number;
  chainID?: 42220 | 11142220;
  userDefinedData?: string;
  selfDefinedData?: string;
}
