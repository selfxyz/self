import { DEFAULT_USER_ID_TYPE, WEBSOCKET_URL } from "../constants/constants";
import { UserIdType } from "./utils";

export type CircuitName = "prove" | "disclose";
export type CircuitMode = "prove_onchain" | "register" | 'prove_offchain';
export type Mode = "prove_offchain" | "prove_onchain" | "register" | "disclose";

// OpenPassportAppType
export interface OpenPassportAppPartial {
  mode: Mode;
  appName: string;
  scope: string;
  websocketUrl: string;
  sessionId: string;
  userId: string;
  userIdType: UserIdType;
}

export interface OpenPassportApp extends OpenPassportAppPartial {
  args: ArgumentsProveOffChain | ArgumentsProveOnChain | ArgumentsRegisterOffChain | ArgumentsRegisterOnChain | ArgumentsDisclose
}

export interface ArgumentsProveOffChain {
  disclosureOptions: DisclosureOptions,
}

export interface ArgumentsProveOnChain {
  disclosureOptions: DisclosureOptions,
  modalServerUrl: string,
  merkleTreeUrl: string,
  rpcUrl: string,
}

export interface ArgumentsRegisterOffChain {
  cscaMerkleTreeUrl: string,
  modalServerUrl: string,
}

export interface ArgumentsRegisterOnChain extends ArgumentsRegisterOffChain {
  rpcUrl: string,
}

export interface ArgumentsDisclose {
  disclosureOptions: DisclosureOptions,
  merkleRoot: string,
  merkletreeSize: string,
}

export interface DisclosureOptions {
  minimumAge: { enabled: boolean; value: string }
  nationality: { enabled: boolean; value: string }
  excludedCountries: { enabled: boolean; value: string[] }
  ofac: boolean
}

