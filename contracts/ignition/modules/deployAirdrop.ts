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

    const airdropToken = m.contract("AirdropToken", []);
       
    const scope = castFromScope('test-scope');
    const attestationId = 1;
    const olderThanEnabled = true;
    const olderThan = 18;
    const forbiddenCountriesEnabled = false;
    const forbiddenCountriesListPacked = [0, 0, 0, 0];
    const ofacEnabled = [true, true, true];

    const airdrop = m.contract("Airdrop", [
        identityVerificationHubAddress,
        scope,
        attestationId,
        airdropToken,
        olderThanEnabled,
        olderThan,
        forbiddenCountriesEnabled,
        forbiddenCountriesListPacked,
        ofacEnabled
    ]);

    const mintAmount = ethers.parseEther("1000000");
    m.call(airdropToken, "mint", [airdrop, mintAmount]);

    return {
        airdropToken,
        airdrop
    };
}); 