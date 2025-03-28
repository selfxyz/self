import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts,ethers } from "hardhat";
import { RegisterVerifierId, DscVerifierId } from "../../../common/src/constants/constants";

export default buildModule("DeployAll", (m) => {
    // Deploy verifiers
    const vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");
    const registerVerifiers: { [key: string]: any } = {};
    for (const key in RegisterVerifierId) {
        if (isNaN(Number(key))) {
            const contractName = `Verifier_${key}`;
            try {
                artifacts.readArtifactSync(contractName);
                registerVerifiers[key] = m.contract(contractName);
                console.log(`Deploying ${contractName}`);
            } catch (error) {
                console.log(`Skipping ${contractName}: Artifact not found`);
            }
        }
    }
    
    const dscVerifiers: { [key: string]: any } = {};
    for (const key in DscVerifierId) {
        if (isNaN(Number(key))) {
            const contractName = `Verifier_${key}`;
            try {   
                artifacts.readArtifactSync(contractName);
                dscVerifiers[key] = m.contract(contractName);
                console.log(`Deploying ${contractName}`);
            } catch (error) {
                console.log(`Skipping ${contractName}: Artifact not found`);
            }
        }
    }

    // Deploy registry
    const poseidonT3 = m.library("PoseidonT3");
    const identityRegistryImpl = m.contract("IdentityRegistryImplV1", [], {
        libraries: { PoseidonT3: poseidonT3 },
    });
    const registryArtifact = artifacts.readArtifactSync("IdentityRegistryImplV1");
    const registryInterface = new ethers.Interface(registryArtifact.abi);
    const registryInitData = registryInterface.encodeFunctionData("initialize", [
        "0x0000000000000000000000000000000000000000"
    ]);
    const registry = m.contract("IdentityRegistry", [
        identityRegistryImpl,
        registryInitData
    ]);

    // Deploy hub
    const identityVerificationHubImpl = m.contract("IdentityVerificationHubImplV1");
    const hubArtifact = artifacts.readArtifactSync("IdentityVerificationHubImplV1");
    const hubInterface = new ethers.Interface(hubArtifact.abi);
    const hubInitData = hubInterface.encodeFunctionData("initialize", [
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        [],
        [],
        [],
        []
    ]);
    const hub = m.contract("IdentityVerificationHub", [
        identityVerificationHubImpl,
        hubInitData
    ]);

    // Deploy verifyAll
    const verifyAll = m.contract("VerifyAll", [hub, registry]);

    return {
        vcAndDiscloseVerifier,
        registerVerifiers,
        dscVerifiers,
        poseidonT3,
        identityRegistryImpl,
        registry,
        identityVerificationHubImpl,
        hub,
        verifyAll
    }
})