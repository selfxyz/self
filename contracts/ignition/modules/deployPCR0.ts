import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import fs from "fs";
import path from "path";

export default buildModule("DeployPCR0", (m) => {
    const networkName = hre.network.config.chainId;

    // Deploy the PCR0Manager contract (implementation from PCR0.sol)
    const pcr0Manager = m.contract("PCR0Manager");

    return {
        pcr0Manager,
    };
});