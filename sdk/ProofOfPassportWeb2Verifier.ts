import { groth16 } from 'snarkjs';
import { attributeToPosition, countryCodes, DEFAULT_RPC_URL, PASSPORT_ATTESTATION_ID } from './common/src/constants/constants';
import { checkMerkleRoot, getCurrentDateFormatted, parsePublicSignals, unpackReveal } from './utils';
import { ProofOfPassportVerifierReport } from './ProofOfPassportVerifierReport';
import { vkey_disclose } from './common/src/constants/vkey';

const MOCK_MERKLE_ROOT_CHECK = false;

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
            this.report.exposeAttribute('scope', parsedPublicSignals.scope, this.scope);
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
            this.report.exposeAttribute('attestation_id', parsedPublicSignals.attestation_id, this.attestationId);
        }
        console.log('\x1b[32m%s\x1b[0m', `- attestation_id verified`);

        //4. Verify the current_date
        if (parsedPublicSignals.current_date.toString() !== getCurrentDateFormatted().toString()) {
            this.report.exposeAttribute('current_date', parsedPublicSignals.current_date, getCurrentDateFormatted());
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

        console.log(vkey_disclose);
        console.log("publicSignals", proofOfPassportWeb2Inputs.publicSignals);
        console.log("proof", proofOfPassportWeb2Inputs.proof);
        const verified_disclose = await groth16.verify(
            vkey_disclose,
            proofOfPassportWeb2Inputs.publicSignals,
            proofOfPassportWeb2Inputs.proof as any
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

export class ProofOfPassportWeb2Inputs {
    publicSignals: string[];
    proof: string[];

    constructor(publicSignals: string[], proof: string[]) {
        this.publicSignals = publicSignals;
        this.proof = proof;
    }
}
