import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import fs from "fs";
import path from "path";

export default buildModule("DeployVerifyAll", (m) => {
    const networkName = hre.network.config.chainId;

    const deployedAddressesPath = path.join(__dirname, `../deployments/chain-${networkName}/deployed_addresses.json`);
    const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));
    const hubAddress = deployedAddresses["DeployHub#IdentityVerificationHub"];
    const registryAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];
    // const hubAddress = "0x95390Dbeb0E890C056c763131BC969A074A46695";
    // const registryAddress = "0x537F2fd23A0432887F32414001Cc7572260544B1";

    const verifyAll = m.contract("VerifyAll", [hubAddress, registryAddress]);
    return {
        verifyAll,
    };
});
