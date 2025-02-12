import { CIRCUIT_CONSTANTS } from "../../../../../contracts/test/utils/constants";
import { 
    Formatter, 
    CircuitAttributeHandler 
} from "../../../../../contracts/test/utils/formatter";
import { 
    PublicSignals,
    Groth16Proof,    
    groth16
} from "snarkjs";

export class ProofVerifier {
    protected ofacEnabled: boolean;
    protected olderThanEnabled: boolean;
    protected excludedCountriesEnabled: boolean;

    protected ofacRoot: string;
    protected olderThan: string;
    protected excludedCountries: string[];
    protected identityCommitmentRoot: string;

    protected vcAndDiscloseCircuitVKey: any; 

    constructor(
        ofacEnabled: boolean,
        olderThanEnabled: boolean,
        excludedCountriesEnabled: boolean,
        ofacRoot: string,
        olderThan: string,
        excludedCountries: string[],
        identityCommitmentRoot: string,
        vcAndDiscloseCircuitVKey: any
    ) {
        this.ofacEnabled = ofacEnabled;
        this.olderThanEnabled = olderThanEnabled;
        this.excludedCountriesEnabled = excludedCountriesEnabled;
        this.ofacRoot = ofacRoot;
        this.olderThan = olderThan;
        this.excludedCountries = excludedCountries;
        this.identityCommitmentRoot = identityCommitmentRoot;
        this.vcAndDiscloseCircuitVKey = vcAndDiscloseCircuitVKey;
    }

    public async verifyVcAndDiscloseProof(
        proof: Groth16Proof,
        publicSignals: PublicSignals,
    ) {

        if (publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX] !== this.identityCommitmentRoot) {
            throw new Error("Invalid identity commitment root");
        }

        let dateNum = new Array(6).fill(0);
        for (let i = 0; i < 6; i++) {
            dateNum[i] = publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_CURRENT_DATE_INDEX + i];
        }

        let currentTimestamp = Formatter.proofDateToUnixTimestamp(dateNum);
        if(
            currentTimestamp < getStartOfDayTimestamp() - 86400 + 1 ||
            currentTimestamp > getStartOfDayTimestamp() + 86400 - 1
        ) {
            throw new Error("Invalid current date");
        }

        let revealedDataPacked: [bigint, bigint, bigint] = [0n, 0n, 0n];
        for (let i = 0; i < 3; i++) {
            revealedDataPacked[i] = publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_REVEALED_DATA_PACKED_INDEX + i];
        }

        if (this.ofacEnabled) {
            if (revealedDataPacked[2] !== 1n) {
                throw new Error("Invalid OFAC");
            }
            if (this.ofacRoot != publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_SMT_ROOT_INDEX]) {
                throw new Error("Invalid OFAC root");
            }
        }

        // extract the oler than value
        if (this.olderThanEnabled) {
            const bytes = Formatter.fieldElementsToBytes(revealedDataPacked);
            if (!CircuitAttributeHandler.compareOlderThan(bytes, Number(this.olderThan))) {
                throw new Error("Invalid older than");
            }
        }

        // extract the excluded countries value
        if (this.excludedCountriesEnabled) {
            const forbiddenCountries = Formatter.extractForbiddenCountriesFromPacked(revealedDataPacked[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX]);
            for (let i = 0; i < this.excludedCountries.length; i++) {
                for (let j = 0; j < forbiddenCountries.length; j++) {
                    if (forbiddenCountries[j] === this.excludedCountries[i]) {
                        break;
                    }
                }
                throw new Error("Invalid excluded countries");
            }
        }
        
        const isValid = await groth16.verify(this.vcAndDiscloseCircuitVKey, publicSignals, proof);
        if (!isValid) {
            throw new Error("Invalid VC and Disclose proof");
        }
    }
}

function getStartOfDayTimestamp() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
}