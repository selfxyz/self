import { UserIdType } from "./utils";

export type CircuitName = "prove" | "register" | "disclose";

export interface AppType {
  name: string,
  scope: string,
  userId: string,
  userIdType?: UserIdType,
  sessionId: string,
  circuit: CircuitName,
  arguments: ArgumentsProve | ArgumentsRegister | ArgumentsDisclose,
  getDisclosureOptions?: () => Record<string, string>
}

export interface ArgumentsProve {
  disclosureOptions: {
    older_than?: string,
    nationality?: string,
  },
}

export interface ArgumentsRegister {
  attestation_id: string,
}

export interface ArgumentsDisclose {
  disclosureOptions: {
    older_than?: string,
    nationality?: string,
  },
  merkle_root: string,
  merkletree_size: string,
}

export function reconstructAppType(json: any): AppType {
  if (typeof json !== 'object' || json === null) {
    throw new Error('Input must be a non-null object');
  }

  if (!json.name || typeof json.name !== 'string') {
    throw new Error('Invalid or missing name');
  }

  if (!json.scope || typeof json.scope !== 'string') {
    throw new Error('Invalid or missing scope');
  }

  if (!json.userId || typeof json.userId !== 'string') {
    throw new Error('Invalid or missing userId');
  }

  if (!json.sessionId || typeof json.sessionId !== 'string') {
    throw new Error('Invalid or missing sessionId');
  }

  if (!json.circuit || !['prove', 'register', 'disclose'].includes(json.circuit)) {
    throw new Error('Invalid or missing circuit');
  }

  if (!json.arguments || typeof json.arguments !== 'object') {
    throw new Error('Invalid or missing arguments');
  }

  let circuitArgs: ArgumentsProve | ArgumentsRegister | ArgumentsDisclose;

  switch (json.circuit) {
    case 'prove':
    case 'disclose':
      if (!json.arguments.disclosureOptions || typeof json.arguments.disclosureOptions !== 'object') {
        throw new Error('Invalid or missing disclosureOptions for prove/disclose');
      }
      circuitArgs = {
        disclosureOptions: {
          older_than: json.arguments.disclosureOptions.older_than,
          nationality: json.arguments.disclosureOptions.nationality,
        },
      };
      if (json.circuit === 'disclose') {
        if (!json.arguments.merkle_root || typeof json.arguments.merkle_root !== 'string') {
          throw new Error('Invalid or missing merkle_root for disclose');
        }
        if (!json.arguments.merkletree_size || typeof json.arguments.merkletree_size !== 'string') {
          throw new Error('Invalid or missing merkletree_size for disclose');
        }
        (circuitArgs as ArgumentsDisclose).merkle_root = json.arguments.merkle_root;
        (circuitArgs as ArgumentsDisclose).merkletree_size = json.arguments.merkletree_size;
      }
      break;
    case 'register':
      if (!json.arguments.attestation_id || typeof json.arguments.attestation_id !== 'string') {
        throw new Error('Invalid or missing attestation_id for register');
      }
      circuitArgs = {
        attestation_id: json.arguments.attestation_id,
      };
      break;
    default:
      throw new Error('Unexpected circuit type');
  }

  return {
    name: json.name,
    scope: json.scope,
    userId: json.userId,
    userIdType: json.userIdType,
    sessionId: json.sessionId,
    circuit: json.circuit as CircuitName,
    arguments: circuitArgs,
    getDisclosureOptions: function () {
      if (this.circuit === 'prove' || this.circuit === 'disclose') {
        return Object.fromEntries(
          Object.entries(this.arguments.disclosureOptions)
            .filter(([_, value]) => value !== '' && value !== undefined)
        ) as Record<string, string>;
      }
      return {};
    }
  };
}
