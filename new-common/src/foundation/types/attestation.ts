import type { EndpointType } from './app.js';

type RegisterSuffixes = '' | '_id' | '_aadhaar' | '_kyc';
type DscSuffixes = '' | '_id';
type DiscloseSuffixes = '' | '_id' | '_aadhaar' | '_kyc';
type ProofTypes = 'register' | 'dsc' | 'disclose';

export type RegisterProofType = `${Extract<ProofTypes, 'register'>}${RegisterSuffixes}`;
export type DscProofType = `${Extract<ProofTypes, 'dsc'>}${DscSuffixes}`;
export type DiscloseProofType = `${Extract<ProofTypes, 'disclose'>}${DiscloseSuffixes}`;

export type TEEPayloadBase = {
  endpointType: EndpointType;
  circuit: {
    name: string;
    inputs: string;
  };
};

export type TEEPayload = TEEPayloadBase & {
  type: RegisterProofType | DscProofType;
  onchain: true;
};

export type TEEPayloadDisclose = TEEPayloadBase & {
  type: DiscloseProofType;
  onchain: boolean;
  endpoint: string;
  userDefinedData: string;
  selfDefinedData: string;
  version: number;
};
