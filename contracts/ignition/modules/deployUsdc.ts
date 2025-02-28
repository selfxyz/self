import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { castFromScope } from "../../../common/src/utils/circuits/uuid";

export default buildModule("DeployAirdrop", (m) => {
    const networkName = hre.network.config.chainId;

    // const deployedAddressesPath = path.join(__dirname, `../deployments/chain-${networkName}/deployed_addresses.json`);
    // const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

    const identityVerificationHubAddress = "0x77117D60eaB7C044e785D68edB6C7E0e134970Ea";

    const usdcToken = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
       
    const scope = castFromScope('Self-Denver-Birthday');
    const attestationId = 1;
    const olderThanEnabled = false;
    const olderThan = 0;
    const forbiddenCountriesEnabled = false;
    const forbiddenCountriesListPacked = [0, 0, 0, 0];
    const ofacEnabled = [false, false, false];

    const usdcDistribution = m.contract("USDCDistribution", [
        identityVerificationHubAddress,
        scope,
        attestationId,
        usdcToken,
        olderThanEnabled,
        olderThan,
        forbiddenCountriesEnabled,
        forbiddenCountriesListPacked,
        ofacEnabled
    ]);

    return {
        usdcDistribution
    };
}); 