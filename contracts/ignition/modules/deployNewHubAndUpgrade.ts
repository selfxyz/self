import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts, ethers } from "hardhat";
import hre from "hardhat";
import fs from "fs";
import path from "path";

function getTestHubInitializeData() {
    const hubArtifact = artifacts.readArtifactSync("testUpgradedIdentityVerificationHubImplV1");
    return new ethers.Interface(hubArtifact.abi);
}

export default buildModule("DeployNewHubAndUpgrade", (m) => {
    const networkName = hre.network.config.chainId;

    const deployedAddressesPath = path.join(__dirname, `../deployments/chain-${networkName}/deployed_addresses.json`);
    const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

    const hubProxyAddress = deployedAddresses["DeployHub#IdentityVerificationHub"];
    if (!hubProxyAddress) {
        throw new Error("Hub proxy address not found in deployed_addresses.json");
    }

    const newHubImpl = m.contract("testUpgradedIdentityVerificationHubImplV1");

    const testHubInterface = getTestHubInitializeData();
    const initializeData = testHubInterface.encodeFunctionData("initialize", [
        true
    ]);

    const hubProxy = m.contractAt("IdentityVerificationHubImplV1", hubProxyAddress);

    m.call(hubProxy, "upgradeToAndCall", [
        newHubImpl,
        initializeData
    ]);

    return {
        newHubImpl,
        hubProxy
    };
});
