import { DEFAULT_USER_ID_TYPE, WEBSOCKET_URL } from "../constants/constants";
import { UserIdType } from "./utils";

export type CircuitName = "prove" | "disclose";
export type CircuitMode = "prove_onchain" | "register" | 'prove_offchain';
export type Mode = "prove_offchain" | "prove_onchain" | "register" | "disclose";
// export interface AppType {
//   name: string,
//   scope: string,
//   userId: string,
//   userIdType: UserIdType,
//   websocketUrl: string,
//   sessionId: string,
//   mode: Mode,
//   arguments: ArgumentsProve | ArgumentsRegister | ArgumentsDisclose
// }

// export interface ArgumentsProve {
//   disclosureOptions: {
//     older_than?: string,
//     nationality?: string,
//     ofac?: string,
//     forbidden_countries_list?: string[]
//   },
// }

// export interface ArgumentsRegister {
//   merkleTreeUrl: string,
//   modalServerUrl: string,
// }

// export interface ArgumentsDisclose {
//   disclosureOptions: {
//     older_than?: string,
//     nationality?: string,
//     ofac?: string,
//     forbidden_countries_list?: string[]

//   },
//   merkle_root: string,
//   merkletree_size: string,
// }


// OpenPassportAppType
export interface OpenPassportAppPartial {
  mode: Mode;
  appName: string;
  scope: string;
  websocketUrl: string;
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
  minimumAge: { enabled: boolean; value: number }
  nationality: { enabled: boolean; value: string }
  excludedCountries: { enabled: boolean; value: string[] }
  ofac: boolean
}

