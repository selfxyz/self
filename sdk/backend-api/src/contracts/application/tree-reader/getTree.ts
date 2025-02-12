import { RegistryContract } from "../registryContract";
import { getChain } from "../chains";
import { TreeType } from "./constants";

export async function getContractInstanceRoot(type: TreeType) {
    switch (type) {
        case 'dsc':
            return getDscKeyCommitmentRoot();
        case 'identity':
            return getIdentityCommitmentRoot();
        case 'csca':
            return getCscaRoot();
        default:
            throw new Error(`Unknown tree type: ${type}`);
    }
}

async function getDscKeyCommitmentRoot() {
    const registryContract = new RegistryContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
    );
    const dscKeyCommitmentRoot = (await registryContract.getDscKeyCommitmentMerkleRoot()).toString();
    return dscKeyCommitmentRoot;
}

async function getIdentityCommitmentRoot() {
    const registryContract = new RegistryContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
    );
    const identityCommitmentRoot = (await registryContract.getIdentityCommitmentMerkleRoot()).toString();
    return identityCommitmentRoot;
}

async function getCscaRoot() {
    const registryContract = new RegistryContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
    );
    const cscaRoot = (await registryContract.getCscaRoot()).toString();
    return cscaRoot;
}
