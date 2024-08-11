import { DEFAULT_RPC_URL, PASSPORT_ATTESTATION_ID, SBT_ABI, SBT_CONTRACT_ADDRESS } from './common/src/constants/constants';
import { ethers } from 'ethers';
import { attributeToGetter } from './utils';
import { OpenPassportVerifierReport } from './OpenPassportVerifierReport';

export class OpenPassportWeb3Verifier {
    scope: string;
    attestationId: string;
    requirements: Array<[string, number | string]>;
    rpcUrl: string;
    report: OpenPassportVerifierReport;

    constructor(options: { scope: string, attestationId?: string, requirements?: Array<[string, number | string]>, rpcUrl?: string }) {
        this.scope = options.scope;
        this.attestationId = options.attestationId || PASSPORT_ATTESTATION_ID;
        this.requirements = options.requirements || [];
        this.rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
        this.report = new OpenPassportVerifierReport();
    }

    async verify(address: string, tokenID: number): Promise<OpenPassportVerifierReport> {
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
                this.report.exposeAttribute(attribute as keyof OpenPassportVerifierReport);
            }
        }
        return this.report;
    }

}