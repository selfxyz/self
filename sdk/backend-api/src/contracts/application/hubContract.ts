import { getContractInstance } from "./getContracts";
import { waitForTransactionReceipt } from "viem/actions";

export class HubContract {
    
    protected hub: any;
    protected client: any;

    constructor(
        chain: any,
        privateKey: `0x${string}`,
        rpcUrl: string
    ) {
        const { contract, publicClient } = getContractInstance("hub", chain, privateKey, rpcUrl);
        this.hub = contract;
        this.client = publicClient;
    }

    public async updateRegistry(
        address: `0x${string}`
    ) {
        const hash = await this.hub.write.updateRegistry([address]);
        await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async updateVcAndDiscloseCircuit(
        address: `0x${string}`
    ) {
        const hash = await this.hub.write.updateVcAndDiscloseCircuit([address]);
        await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async updateRegisterCircuitVerifier(
        id: number,
        address: `0x${string}`
    ) {
        const hash = await this.hub.write.updateRegisterCircuitVerifier(
            [
                id,
                address
            ]
        );
        await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async updateDscVerifier(
        id: number,
        address: `0x${string}`
    ) {
        const hash = await this.hub.write.updateDscVerifier(
            [
                id,
                address
            ]
        );
        await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async sigTypeToRegisterCircuitVerifiers(
        id: number
    ) {
        const address = await this.hub.read.sigTypeToRegisterCircuitVerifiers([id]);
        return address;
    }

    public async sigTypeToDscCircuitVerifiers(
        id: number
    ) {
        const address = await this.hub.read.sigTypeToDscCircuitVerifiers([id]);
        return address
    }
}