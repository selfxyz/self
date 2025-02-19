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
    // const hubAddress = "0x1Fe004D984a6Caba2a3849A4a20BAA08350e91CB";
    // const registryAddress = "0x537F2fd23A0432887F32414001Cc7572260544B1";

    const verifyAll = m.contract("VerifyAll", [hubAddress, registryAddress]);
    return {
        verifyAll,
    };
});
