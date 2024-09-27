import { ECDSA_K_LENGTH_FACTOR, k_dsc, k_dsc_ecdsa } from "../constants/constants";
import { parseDSC } from "./certificates/handleCertificate";
import { bigIntToHex, castToScope, castToUUID, UserIdType } from "./utils";

export interface OpenPassportAttestation {
    '@context': string[];
    type: string[];
    issuer: string;
    issuanceDate: string;
    credentialSubject: {
        userId: string;
        application: string;
    };
    proof: {
        type: string;
        verificationMethod: string;
        value: {
            proof: string[];
            publicSignals: string[];
        };
        vkey: string;
    };
    dscProof: {
        type: string;
        verificationMethod: string;
        value: {
            proof: string[];
            publicSignals: string[];
        };
        vkey: string;
    };
    dsc: {
        type: string;
        value: string;
        encoding: string;
    };
}
export function buildAttestation(options: {
    proof: string[];
    publicSignals: string[];
    dscProof?: string[];
    dscPublicSignals?: string[];
    dsc: string;
    userIdType?: UserIdType;
}): OpenPassportDynamicAttestation {
    const { proof, publicSignals, dscProof, dscPublicSignals, dsc, userIdType = 'uuid' } = options;

    // Parse the DSC (Document Signing Certificate)
    const dscParsed = parseDSC(dsc);

    // Determine the scaling factor based on the signature algorithm
    let kScaled: number;
    const { signatureAlgorithm } = dscParsed;
    switch (signatureAlgorithm) {
        case 'ecdsa':
            kScaled = ECDSA_K_LENGTH_FACTOR * k_dsc_ecdsa;
            break;
        default:
            kScaled = k_dsc;
    }

    // Parse the public signals
    const parsedPublicSignals = parsePublicSignalsProve(publicSignals, kScaled);

    // Get user identifier
    const rawUserId = parsedPublicSignals.user_identifier;
    let userId: string;
    switch (userIdType) {
        case 'ascii':
            userId = castToScope(BigInt(rawUserId));
            break;
        case 'hex':
            userId = bigIntToHex(BigInt(rawUserId));
            break;
        case 'uuid':
            userId = castToUUID(BigInt(rawUserId));
            break;
        default:
            userId = rawUserId;
    }

    const scope = castToScope(BigInt(parsedPublicSignals.scope));

    const attestation: OpenPassportAttestation = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://openpassport.app'
        ],
        type: ['OpenPassportAttestation', 'PassportCredential'],
        issuer: 'https://openpassport.app',
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
            userId: userId,
            application: scope
        },
        proof: {
            type: 'ZeroKnowledgeProof',
            verificationMethod: 'https://github.com/zk-passport/openpassport',
            value: {
                proof: proof,
                publicSignals: publicSignals,
            },
            vkey: "",
        },
        dscProof: {
            type: 'ZeroKnowledgeProof',
            verificationMethod: 'https://github.com/zk-passport/openpassport',
            value: {
                proof: dscProof || [],
                publicSignals: dscPublicSignals || [],
            },
            vkey: "",
        },
        dsc: {
            type: 'X509Certificate',
            value: dsc || '',
            encoding: 'PEM',
        }
    };

    // Return an instance of OpenPassportDynamicAttestation
    return new OpenPassportDynamicAttestation(attestation, userIdType);
}

// New OpenPassportDynamicAttestation class extending OpenPassportAttestation
export class OpenPassportDynamicAttestation implements OpenPassportAttestation {
    '@context': string[];
    type: string[];
    issuer: string;
    issuanceDate: string;
    credentialSubject: {
        userId: string;
        application: string;
    };
    proof: {
        type: string;
        verificationMethod: string;
        value: {
            proof: string[];
            publicSignals: string[];
        };
        vkey;
    };
    dscProof: {
        type: string;
        verificationMethod: string;
        value: {
            proof: string[];
            publicSignals: string[];
        };
        vkey;
    };
    dsc: {
        type: string;
        value: string;
        encoding: string;
    };

    private parsedPublicSignals: any;
    private userIdType: UserIdType;

    constructor(attestation: OpenPassportAttestation, userIdType: UserIdType = 'uuid') {
        this['@context'] = attestation['@context'];
        this.type = attestation.type;
        this.issuer = attestation.issuer;
        this.issuanceDate = attestation.issuanceDate;
        this.credentialSubject = attestation.credentialSubject;
        this.proof = attestation.proof;
        this.dscProof = attestation.dscProof;
        this.dsc = attestation.dsc;
        this.userIdType = userIdType;
        this.parsedPublicSignals = this.parsePublicSignals();
    }

    private parsePublicSignals() {
        const dscParsed = parseDSC(this.dsc.value);

        let kScaled: number;
        const { signatureAlgorithm } = dscParsed;
        switch (signatureAlgorithm) {
            case 'ecdsa':
                kScaled = ECDSA_K_LENGTH_FACTOR * k_dsc_ecdsa;
                break;
            default:
                kScaled = k_dsc;
        }

        // Parse the public signals
        return parsePublicSignalsProve(this.proof.value.publicSignals, kScaled);
    }

    getUserId(): string {
        const rawUserId = (this.parsedPublicSignals as any).user_identifier;
        switch (this.userIdType) {
            case 'ascii':
                return castToScope(BigInt(rawUserId));
            case 'hex':
                return bigIntToHex(BigInt(rawUserId));
            case 'uuid':
                return castToUUID(BigInt(rawUserId));
            default:
                return rawUserId;
        }
    }

    getNullifier(): string {
        return bigIntToHex(BigInt(this.parsedPublicSignals.nullifier));
    }
}

export function parsePublicSignalsProve(publicSignals, kScaled) {
    return {
        nullifier: publicSignals[0],
        revealedData_packed: [publicSignals[1], publicSignals[2], publicSignals[3]],
        older_than: [publicSignals[4], publicSignals[5]],
        pubKey_disclosed: publicSignals.slice(6, 6 + kScaled),
        commitment: publicSignals[6 + kScaled],
        blinded_dsc_commitment: publicSignals[7 + kScaled],
        current_date: publicSignals.slice(8 + kScaled, 8 + kScaled + 6),
        user_identifier: publicSignals[8 + kScaled + 6],
        scope: publicSignals[9 + kScaled + 6],

    };
}