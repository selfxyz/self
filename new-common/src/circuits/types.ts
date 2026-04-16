import type { DisclosureField, IDocument } from '../documents/interface.js';
import type { PassportDocument } from '../documents/passport/adapter.js';
import type { AadhaarDocument } from '../documents/aadhaar/adapter.js';
import type { KycDocument } from '../documents/kyc/adapter.js';
import type { AadhaarDiscloseInputOpts } from './inputs/disclose-aadhaar.js';
import type { KycDiscloseInputOpts } from './inputs/disclose-kyc.js';
import type { LeanIMT, SMT } from '../trees/index.js';

// ── Per-document option types ────────────────────────────────

export interface PassportRegisterOpts {
  useTestPadding?: boolean;
}

export interface PassportDiscloseOpts {
  scope: string;
  fieldsToReveal: DisclosureField[];
  merkletree: LeanIMT;
  majority: string;
  passportNo_smt: SMT | null;
  nameAndDob_smt: SMT;
  nameAndYob_smt: SMT;
  forbidden_countries_list: string[];
  user_identifier: string;
}

// ── Conditional option type maps ─────────────────────────────

export type RegisterOptsFor<T extends IDocument> = T extends PassportDocument
  ? PassportRegisterOpts
  : T extends AadhaarDocument
    ? Record<string, never>
    : Record<string, unknown>;

export type DiscloseOptsFor<T extends IDocument> = T extends PassportDocument
  ? PassportDiscloseOpts
  : T extends AadhaarDocument
    ? AadhaarDiscloseInputOpts
    : T extends KycDocument
      ? KycDiscloseInputOpts
      : Record<string, unknown>;

// ── Passport circuit input shapes ────────────────────────────

export interface PassportRegisterInputs {
  raw_dsc: string[];
  raw_dsc_actual_length: string[];
  dsc_pubKey_offset: string[];
  dsc_pubKey_actual_size: string[];
  dg1: string[];
  dg1_hash_offset: string[];
  eContent: string[];
  eContent_padded_length: string[];
  signed_attr: string[];
  signed_attr_padded_length: string[];
  signed_attr_econtent_hash_offset: string[];
  pubKey_dsc: string[];
  signature_passport: string[];
  merkle_root: string[];
  leaf_depth: string[];
  path: string[];
  siblings: string[];
  csca_tree_leaf: string[];
  secret: string[];
}

export interface PassportDscInputs {
  raw_csca: string[];
  raw_csca_actual_length: string;
  csca_pubKey_offset: string;
  csca_pubKey_actual_size: string;
  raw_dsc: string[];
  raw_dsc_padded_length: string;
  csca_pubKey: string[];
  signature: string[];
  merkle_root: string;
  path: string[];
  siblings: string[];
}

export interface PassportDiscloseInputs {
  secret: string[];
  attestation_id: string[];
  dg1: string[];
  eContent_shaBytes_packed_hash: string[];
  dsc_tree_leaf: string[];
  merkle_root: string[];
  leaf_depth: string[];
  path: string[];
  siblings: string[];
  selector_dg1: string[];
  selector_older_than: string[];
  scope: string[];
  current_date: string[];
  majority: string[];
  user_identifier: string[];
  selector_ofac: string[];
  forbidden_countries_list: string[];
  ofac_namedob_smt_root: string[];
  ofac_namedob_smt_leaf_key: string[];
  ofac_namedob_smt_siblings: string[];
  ofac_nameyob_smt_root: string[];
  ofac_nameyob_smt_leaf_key: string[];
  ofac_nameyob_smt_siblings: string[];
  ofac_passportno_smt_root?: string[];
  ofac_passportno_smt_leaf_key?: string[];
  ofac_passportno_smt_siblings?: string[];
}

// ── Conditional return type maps ─────────────────────────────

export type RegisterInputsFor<T extends IDocument> = T extends PassportDocument
  ? PassportRegisterInputs
  : Record<string, string[]>;

export type DscInputsFor<T extends IDocument> = T extends PassportDocument
  ? PassportDscInputs
  : Record<string, string | string[]>;

export type DiscloseInputsFor<T extends IDocument> = T extends PassportDocument
  ? PassportDiscloseInputs
  : Record<string, string[]>;

// ── ICircuitInputGenerator ───────────────────────────────────

export interface ICircuitInputGenerator {
  generateRegisterInputs<T extends IDocument>(
    doc: T,
    secret: string,
    serializedDscTree: string,
    opts?: RegisterOptsFor<T>,
  ): RegisterInputsFor<T>;

  generateDscInputs<T extends IDocument>(doc: T, serializedCscaTree: string[][]): DscInputsFor<T>;

  generateDiscloseInputs<T extends IDocument>(
    doc: T,
    secret: string,
    opts: DiscloseOptsFor<T>,
  ): DiscloseInputsFor<T>;
}
