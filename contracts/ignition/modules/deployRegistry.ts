import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts } from "hardhat";
import { ethers } from "ethers";

export default buildModule("DeployRegistryModule", (m) => {
    // Deploy PoseidonT3
    const poseidonT3 = m.library("PoseidonT3");
    
    // Deploy IdentityRegistryImplV1
    const identityRegistryImpl = m.contract("IdentityRegistryImplV1", [], {
        libraries: { PoseidonT3: poseidonT3 },
    });

    // Deploy registry with temporary hub address
    const registryInterface = getRegistryInitializeData();
    const registryInitData = registryInterface.encodeFunctionData("initialize", [
        "0x0000000000000000000000000000000000000000"
    ]);
    const registry = m.contract("IdentityRegistry", [
        identityRegistryImpl,
        registryInitData
    ]);

    // Return deployed contracts
    return {
        poseidonT3,
        identityRegistryImpl,
        registry
    };
});

function getRegistryInitializeData() {
    const registryArtifact = artifacts.readArtifactSync("IdentityRegistryImplV1");
    const registryInterface = new ethers.Interface(registryArtifact.abi);
    return registryInterface;
}