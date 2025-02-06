import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts, ethers } from "hardhat";
import hre from "hardhat";
import fs from "fs";
import path from "path";

function getHubInitializeData() {
    const hubArtifact = artifacts.readArtifactSync("IdentityVerificationHubImplV1");
    return new ethers.Interface(hubArtifact.abi);
}

export default buildModule("DeployHub", (m) => {
    const networkName = hre.network.config.chainId;

    const deployedAddressesPath = path.join(__dirname, `../deployments/chain-${networkName}/deployed_addresses.json`);
    const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

    const registryAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];
    const vcAndDiscloseVerifierAddress = deployedAddresses["DeployVerifiers#Verifier_vc_and_disclose"];
    const registerVerifierAddress = deployedAddresses["DeployVerifiers#Verifier_register_sha256_sha256_sha256_rsa_65537_4096"];
    const dscVerifierAddress = deployedAddresses["DeployVerifiers#Verifier_dsc_sha256_rsa_65537_4096"];

    const identityVerificationHubImpl = m.contract("IdentityVerificationHubImplV1");

    const hubInterface = getHubInitializeData();
    const initializeData = hubInterface.encodeFunctionData("initialize", [
        registryAddress,
        vcAndDiscloseVerifierAddress,
        ["0"],
        [registerVerifierAddress],
        ["0"],
        [dscVerifierAddress]
    ]);

    const hub = m.contract("IdentityVerificationHub", [
        identityVerificationHubImpl,
        initializeData
    ]);

    return {
        hub,
        identityVerificationHubImpl,
    };
});