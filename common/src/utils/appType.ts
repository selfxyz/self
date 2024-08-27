export type CircuitName = "prove" | "register" | "disclose";

export interface AppType {
  name: string,
  scope: string,
  userId: string,
  sessionId: string,
  circuit: CircuitName,
  arguments: ArgumentsProve | ArgumentsRegister | ArgumentsDisclose
}

export interface ArgumentsProve {
  disclosureOptions: {
    older_than?: string,
    nationality?: string,
  },
  scope: string,
  user_identifier: string
}

export interface ArgumentsRegister {
  attestation_id: string,
}

export interface ArgumentsDisclose {
  disclosureOptions: {
    older_than?: string,
    nationality?: string,
  },
  scope: string,
  user_identifier: string,
  merkle_root: string,
  merkletree_size: string,
}