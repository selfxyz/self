import { groth16 } from 'snarkjs';
import fs from 'fs';
import { attributeToPosition, countryCodes, DEFAULT_RPC_URL, REGISTER_ABI, REGISTER_CONTRACT_ADDRESS } from '../common/src/constants/constants';
import { ethers } from 'ethers';
import { getCurrentDateYYMMDD } from '../common/src/utils/utils';

const path_disclose_vkey = "../circuits/build/disclose_vkey.json";
const MOCK_MERKLE_ROOT_CHECK = true;

export class ProofOfPassportWeb2Verifier {
    scope: string;
    attestationId: string;
    requirements: Array<[string, number | string]>;
    rpcUrl: string;

    constructor(scope: string, attestationId: string, requirements: Array<[string, number | string]>, rpcUrl: string = DEFAULT_RPC_URL) {
        this.scope = scope;
        this.attestationId = attestationId;
        this.requirements = requirements.map(requirement => {
            if (!attributeToPosition.hasOwnProperty(requirement[0])) {
                throw new Error(`Attribute ${requirement[0]} is not recognized.`);
            }
            return requirement;
        });
        this.rpcUrl = rpcUrl;
    }

    async verifyInputs(publicSignals, proof) {
        const parsedPublicSignals = parsePublicSignals(publicSignals);
        //1. Verify the scope
        if (parsedPublicSignals.scope !== this.scope) {
            throw new Error(`Scope ${parsedPublicSignals.scope} does not match the scope ${this.scope}`);
        }
        console.log('\x1b[32m%s\x1b[0m', `- scope verified`);

        //2. Verify the merkle_root
        const merkleRootIsValid = await checkMerkleRoot(this.rpcUrl, parsedPublicSignals.merkle_root);
        if (!(merkleRootIsValid || MOCK_MERKLE_ROOT_CHECK)) {
            throw new Error(`Merkle root is not valid`);
        }
        console.log('\x1b[32m%s\x1b[0m', `- merkle_root verified`);

        //3. Verify the attestation_id
        if (parsedPublicSignals.attestation_id !== this.attestationId) {
            throw new Error(`Attestation id ${parsedPublicSignals.attestation_id} does not match the attestation id ${this.attestationId}`);
        }
        console.log('\x1b[32m%s\x1b[0m', `- attestation_id verified`);

        //4. Verify the current_date
        if (parsedPublicSignals.current_date.toString() !== getCurrentDateFormatted().toString()) {
            throw new Error(`Current date ${parsedPublicSignals.current_date} does not match the current date ${getCurrentDateFormatted()}`);
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
                    throw new Error(`Attribute ${attribute} does not match the value ${value}`);
                }
            }
            else {
                if (attributeValue !== value) {
                    throw new Error(`Attribute ${attribute} does not match the value ${value}`);
                }
            }
            console.log('\x1b[32m%s\x1b[0m', `- requirement ${requirement[0]} verified`);

        }

        //6. Verify the proof
        const vkey_disclose = JSON.parse(fs.readFileSync(path_disclose_vkey) as unknown as string);
        const verified_disclose = await groth16.verify(
            vkey_disclose,
            publicSignals,
            proof
        )
        if (!verified_disclose) {
            throw new Error(`Proof is not valid`);
        }
        console.log('\x1b[32m%s\x1b[0m', `- proof verified`);

        const result = {
            nullifier: parsedPublicSignals.nullifier,
            user_identifier: parsedPublicSignals.user_identifier,
        };
        return result;
    }
}

function getCurrentDateFormatted() {
    return getCurrentDateYYMMDD().map(datePart => BigInt(datePart).toString());
}

async function checkMerkleRoot(rpcUrl: string, merkleRoot: number) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(REGISTER_CONTRACT_ADDRESS, REGISTER_ABI, provider);
    return await contract.checkRoot(merkleRoot);
}

function parsePublicSignals(publicSignals) {
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

export function unpackReveal(revealedData_packed: string[]): string[] {


    const bytesCount = [31, 31, 28]; // nb of bytes in each of the first three field elements
    const bytesArray = revealedData_packed.flatMap((element: string, index: number) => {
        const bytes = bytesCount[index];
        const elementBigInt = BigInt(element);
        const byteMask = BigInt(255); // 0xFF
        const bytesOfElement = [...Array(bytes)].map((_, byteIndex) => {
            return (elementBigInt >> (BigInt(byteIndex) * BigInt(8))) & byteMask;
        });
        return bytesOfElement;
    });

    return bytesArray.map((byte: bigint) => String.fromCharCode(Number(byte)));
}
