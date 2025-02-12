import dotenv from "dotenv";
import { getContractInstance } from "./getContracts";
import { getChain } from "./chains";
import { ProofVerifier } from "./proofVerifier";

dotenv.config();

const network = process.env.NETWORK as string;
const chain = getChain(network);

export class PassportVerifier extends ProofVerifier {
    constructor(
        ofacEnabled: boolean,
        olderThanEnabled: boolean,
        excludedCountriesEnabled: boolean,
        ofacRoot: string,
        olderThan: string,
        excludedCountries: string[],
        identityCommitmentRoot: string,
    )
}
