import type { Groth16Proof, PublicSignals } from 'snarkjs';

export interface SelfVerificationResult {
  isValid: boolean;
  isValidDetails: {
    isValidScope: boolean;
    isValidAttestationId: boolean;
    isValidProof: boolean;
    isValidNationality: boolean;
  };
  userId: string;
  application: string;
  nullifier: string;
  credentialSubject: {
    merkle_root?: string;
    attestation_id?: string;
    current_date?: string;
    issuing_state?: string;
    name?: string;
    passport_number?: string;
    nationality?: string;
    date_of_birth?: string;
    gender?: string;
    expiry_date?: string;
    older_than?: string;
    passport_no_ofac?: boolean;
    name_and_dob_ofac?: boolean;
    name_and_yob_ofac?: boolean;
  };
  proof: {
    value: {
      proof: Groth16Proof;
      publicSignals: PublicSignals;
    };
  };
  error: any;
}

export function parsePublicSignalsDisclose(publicSignals) {
  return {
    revealedData_packed: publicSignals.slice(0, 2),
    forbidden_countries_list_packed: publicSignals.slice(3),
    nullifier: publicSignals[4],
    attestation_id: publicSignals[5],
    merkle_root: publicSignals[6],
    current_date: publicSignals.slice(7, 12),
    smt_root: publicSignals[13],
    user_identifier: publicSignals[14],
    scope: publicSignals[15],
  };
}
