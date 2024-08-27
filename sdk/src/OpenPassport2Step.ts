import { groth16 } from 'snarkjs';
import { attributeToPosition, countryCodes, DEFAULT_RPC_URL, PASSPORT_ATTESTATION_ID } from '../../common/src/constants/constants';
import { getCurrentDateFormatted } from '../utils/utils';
import { unpackReveal } from '../../common/src/utils/revealBitmap';
import { OpenPassportVerifierReport } from './OpenPassportVerifierReport';
import { vkey_disclose } from '../../common/src/constants/vkey';

export class OpenPassport2StepVerifier {
    scope: string;
    attestationId: string;
    requirements: string[][];
    rpcUrl: string;
    report: OpenPassportVerifierReport;
    verifyMerkleRootCall: (merkleRoot: string) => Promise<boolean>;

    constructor(options: { scope: string, attestationId?: string, requirements?: string[][], rpcUrl?: string, verifyMerkleRootCall: (merkleRoot: string) => Promise<boolean> }) {
        this.scope = options.scope;
        this.attestationId = options.attestationId || PASSPORT_ATTESTATION_ID;
        this.requirements = options.requirements || [];
        this.rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
        this.report = new OpenPassportVerifierReport();
    }

    async verify(proofOfPassport2StepInputs: OpenPassport2StepInputs): Promise<OpenPassportVerifierReport> {
        const parsedPublicSignals = parsePublicSignals2Step(proofOfPassport2StepInputs.publicSignals);
        //1. Verify the scope
        if (parsedPublicSignals.scope !== this.scope) {
            this.report.exposeAttribute('scope', parsedPublicSignals.scope, this.scope);
        }
        console.log('\x1b[32m%s\x1b[0m', `- scope verified`);

        //2. Verify the merkle_root
        const merkleRootIsValid = await this.verifyMerkleRootCall(parsedPublicSignals.merkle_root);
        if (!merkleRootIsValid) {
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
                    this.report.exposeAttribute(attribute as keyof OpenPassportVerifierReport);
                }
            }
            else {
                if (attributeValue !== value) {
                    this.report.exposeAttribute(attribute as keyof OpenPassportVerifierReport);
                }
            }
            console.log('\x1b[32m%s\x1b[0m', `- requirement ${requirement[0]} verified`);

        }

        //6. Verify the proof
        const verified_disclose = await groth16.verify(
            vkey_disclose,
            proofOfPassport2StepInputs.publicSignals,
            proofOfPassport2StepInputs.proof as any
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

export class OpenPassport2StepInputs {
    publicSignals: string[];
    proof: string[];

    constructor(publicSignals: string[], proof: string[]) {
        this.publicSignals = publicSignals;
        this.proof = proof;
    }
}

export function parsePublicSignals2Step(publicSignals) {
    return {
        nullifier: publicSignals[0],
        revealedData_packed: [publicSignals[1], publicSignals[2], publicSignals[3]],
        attestation_id: publicSignals[4],
        merkle_root: publicSignals[5],
        scope: publicSignals[6],
        current_date: [publicSignals[7], publicSignals[8], publicSignals[9], publicSignals[10], publicSignals[11], publicSignals[12]],
        user_identifier: publicSignals[13],
    }
}