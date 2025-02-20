import { getContractInstance } from "./getContracts";
import { waitForTransactionReceipt } from "viem/actions";

export class RegistryContract {

    protected registry: any;
    protected client: any;

    constructor(
        chain: any,
        privateKey: `0x${string}`,
        rpcUrl: string
    ) {
        const { contract, publicClient } = getContractInstance("registry", chain, privateKey, rpcUrl);
        this.registry = contract;
        this.client = publicClient;
    }

    public async transferOwnership(
        newOwner: `0x${string}`
    ) {
        const hash = await this.registry.write.transferOwnership([newOwner]) as `0x${string}`;
        const receipt = await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async acceptOwnership() {
        const hash = await this.registry.write.acceptOwnership() as `0x${string}`;
        const receipt = await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async devAddIdentityCommitment(
        attestationId: string,
        nullifier: bigint,
        commitment: bigint
    ) {
        const hash = await this.registry.write.devAddIdentityCommitment(
            [attestationId, nullifier, commitment]
        ) as `0x${string}`;
        const receipt = await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async updateCscaRoot(root: bigint) {
        const hash = await this.registry.write.updateCscaRoot([root]) as `0x${string}`;
        const receipt = await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async nullifiers(
        attestationId: string,
        nullifier: string
    ) {
        const isNullifierOnchain = await this.registry.read.nullifiers([attestationId, nullifier]);
        return isNullifierOnchain;
    }

    public async devAddDscKeyCommitment(
        dscCommitment: bigint
    ) {
        const hash = await this.registry.write.devAddDscKeyCommitment([dscCommitment]) as `0x${string}`;
        const receipt = await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async updateHub(
        address: `0x${string}`
    ) {
        const hash = await this.registry.write.updateHub([address]) as `0x${string}`;
        await waitForTransactionReceipt(this.client, { hash });
        return { hash };
    }

    public async getIdentityCommitmentMerkleRoot() {
        const root = await this.registry.read.getIdentityCommitmentMerkleRoot();
        return root;
    }

    public async getDscKeyCommitmentMerkleRoot() {
        const root = await this.registry.read.getDscKeyCommitmentMerkleRoot();
        return root;
    }

    public async getCscaRoot() {
        const root = await this.registry.read.getCscaRoot();
        return root;
    }

    public async getOfacRoot() {
        const root = await this.registry.read.getOfacRoot();
        return root;
    }
}