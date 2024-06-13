import { groth16 } from 'snarkjs';
import fs from 'fs';
import { attributeToPosition, countryCodes, DEFAULT_RPC_URL, PASSPORT_ATTESTATION_ID, SBT_ABI, SBT_CONTRACT_ADDRESS } from '../common/src/constants/constants';
import { ethers } from 'ethers';
import { attributeToGetter, checkMerkleRoot, getCurrentDateFormatted, parsePublicSignals, unpackReveal } from './utils';
import dotenv from 'dotenv';

dotenv.config();

const path_disclose_vkey = "../circuits/build/disclose_vkey.json";
const MOCK_MERKLE_ROOT_CHECK = process.env.MOCK_MERKLE_ROOT_CHECK === 'true' ? true : false;

export class ProofOfPassportWeb2Verifier {
    scope: string;
    attestationId: string;
    requirements: Array<[string, number | string]>;
    rpcUrl: string;
    report: ProofOfPassportVerifierReport;

    constructor(options: { scope: string, attestationId?: string, requirements?: Array<[string, number | string]>, rpcUrl?: string }) {
        this.scope = options.scope;
        this.attestationId = options.attestationId || PASSPORT_ATTESTATION_ID;
        this.requirements = options.requirements || [];
        this.rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
        this.report = new ProofOfPassportVerifierReport();
    }

    async verify(proofOfPassportWeb2Inputs: ProofOfPassportWeb2Inputs): Promise<ProofOfPassportVerifierReport> {
        const parsedPublicSignals = parsePublicSignals(proofOfPassportWeb2Inputs.publicSignals);
        //1. Verify the scope
        if (parsedPublicSignals.scope !== this.scope) {
            this.report.exposeAttribute('scope');
        }
        console.log('\x1b[32m%s\x1b[0m', `- scope verified`);

        //2. Verify the merkle_root
        const merkleRootIsValid = await checkMerkleRoot(this.rpcUrl, parsedPublicSignals.merkle_root);
        if (!(merkleRootIsValid || MOCK_MERKLE_ROOT_CHECK)) {
            this.report.exposeAttribute('merkle_root');
        }
        console.log('\x1b[32m%s\x1b[0m', `- merkle_root verified`);

        //3. Verify the attestation_id
        if (parsedPublicSignals.attestation_id !== this.attestationId) {
            this.report.exposeAttribute('attestation_id');
        }
        console.log('\x1b[32m%s\x1b[0m', `- attestation_id verified`);

        //4. Verify the current_date
        if (parsedPublicSignals.current_date.toString() !== getCurrentDateFormatted().toString()) {
            this.report.exposeAttribute('current_date');
        }
        console.log('\x1b[32m%s\x1b[0m', `- current_date verified`);

        //5. Verify requirements
        const unpackedReveal = unpackReveal(parsedPublicSignals.revealedData_packed);
        for (const requirement of this.requirements) {
            const attribute = requirement[0];
            const value = requirement[1];
            const position = attributeToPosition[attribute];
            let attributeValue = '';
            for (let i = position[0]; i <= position[1]; i++) {
                attributeValue += unpackedReveal[i];
            }
            if (requirement[0] === "nationality" || requirement[0] === "issuing_state") {
                if (!countryCodes[attributeValue] || countryCodes[attributeValue] !== value) {
                    this.report.exposeAttribute(attribute as keyof ProofOfPassportVerifierReport);
                }
            }
            else {
                if (attributeValue !== value) {
                    this.report.exposeAttribute(attribute as keyof ProofOfPassportVerifierReport);
                }
            }
            console.log('\x1b[32m%s\x1b[0m', `- requirement ${requirement[0]} verified`);

        }

        //6. Verify the proof
        const vkey_disclose = JSON.parse(fs.readFileSync(path_disclose_vkey) as unknown as string);
        const verified_disclose = await groth16.verify(
            vkey_disclose,
            proofOfPassportWeb2Inputs.publicSignals,
            proofOfPassportWeb2Inputs.proof
        )
        if (!verified_disclose) {
            this.report.exposeAttribute('proof');
        }
        console.log('\x1b[32m%s\x1b[0m', `- proof verified`);

        this.report.nullifier = parsedPublicSignals.nullifier;
        this.report.user_identifier = parsedPublicSignals.user_identifier;

        return this.report;
    }
}
export class ProofOfPassportWeb3Verifier {
    scope: string;
    attestationId: string;
    requirements: Array<[string, number | string]>;
    rpcUrl: string;
    report: ProofOfPassportVerifierReport;

    constructor(options: { scope: string, attestationId?: string, requirements?: Array<[string, number | string]>, rpcUrl?: string }) {
        this.scope = options.scope;
        this.attestationId = options.attestationId || PASSPORT_ATTESTATION_ID;
        this.requirements = options.requirements || [];
        this.rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
        this.report = new ProofOfPassportVerifierReport();
    }

    async verify(address: string, tokenID: number): Promise<ProofOfPassportVerifierReport> {
        const provider = new ethers.JsonRpcProvider(this.rpcUrl);
        const contract = new ethers.Contract(SBT_CONTRACT_ADDRESS, SBT_ABI, provider);

        //1. Verify the user owns a soulbond token
        const ownerOfToken = await contract.ownerOf(tokenID);
        if (ownerOfToken !== address) {
            this.report.exposeAttribute('owner_of');
        }

        //2. Verify attributes of the soublond token
        for (const requirement of this.requirements) {
            const attribute = requirement[0];
            const value = requirement[1];
            const getterName = attributeToGetter[attribute];
            if (typeof contract[getterName] !== 'function') {
                console.error(`No such function ${getterName} on contract`);
                continue;
            }
            const SBTAttribute = await contract[getterName](tokenID);
            if (SBTAttribute !== value) {
                this.report.exposeAttribute(attribute as keyof ProofOfPassportVerifierReport);
            }
        }
        return this.report;
    }

}

class ProofOfPassportVerifierReport {
    scope: boolean = false;
    merkle_root: boolean = false;
    attestation_id: boolean = false;
    current_date: boolean = false;
    issuing_state: boolean = false;
    name: boolean = false;
    passport_number: boolean = false;
    nationality: boolean = false;
    date_of_birth: boolean = false;
    gender: boolean = false;
    expiry_date: boolean = false;
    older_than: boolean = false;
    owner_of: boolean = false;
    proof: boolean = false;

    valid: boolean = true;

    public user_identifier: number;
    public nullifier: number;

    constructor() { }

    exposeAttribute(attribute: keyof ProofOfPassportVerifierReport) {
        (this[attribute] as boolean) = true;
        this.valid = false;
    }

    toJson() {
        return JSON.stringify(this);
    }

}

export class ProofOfPassportWeb2Inputs {
    publicSignals: string[];
    proof: string[];

    constructor(publicSignals: string[], proof: string[]) {
        this.publicSignals = publicSignals;
        this.proof = proof;
    }
}

