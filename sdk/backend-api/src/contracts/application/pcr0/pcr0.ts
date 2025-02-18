import { getContractInstance } from "../getContracts";
import { waitForTransactionReceipt } from "viem/actions";

export class PCR0Contract {
    protected pcr0: any;
    protected client: any;

    constructor(
        chain: any,
        privateKey: `0x${string}`,
        rpcUrl: string
    ) {
        const { contract, publicClient } = getContractInstance("PCR0Manager", chain, privateKey, rpcUrl);
        this.pcr0 = contract;
        this.client = publicClient;
        console.log(this.pcr0);
    }

    public async addPCR0(pcr0: `0x${string}`) {
        const hash = await this.pcr0.write.addPCR0([pcr0]) as `0x${string}`;
        const receipt = await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async removePCR0(pcr0: `0x${string}`) {
        const hash = await this.pcr0.write.removePCR0([pcr0]) as `0x${string}`;
        const receipt = await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async isPCR0Set(pcr0: `0x${string}`): Promise<boolean> {
        console.log(this.pcr0);
        const exists = await this.pcr0.read.isPCR0Set([pcr0]);
        return exists;
    }

    public async transferOwnership(newOwner: `0x${string}`) {
        const hash = await this.pcr0.write.transferOwnership([newOwner]) as `0x${string}`;
        const receipt = await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async renounceOwnership() {
        const hash = await this.pcr0.write.renounceOwnership() as `0x${string}`;
        const receipt = await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async owner(): Promise<`0x${string}`> {
        const ownerAddress = await this.pcr0.read.owner();
        return ownerAddress;
    }
}
