/**
 * upgrade:status task
 *
 * Shows current deployment status for a contract.
 */

import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  log,
  getContractDefinition,
  getNetworkDeployment,
  getGovernanceConfig,
  getVersionInfo,
  shortenAddress,
  getExplorerUrl,
} from "./utils";
import { CONTRACT_IDS, ContractId, SupportedNetwork } from "./types";

interface StatusTaskArgs {
  contract: ContractId;
}

task("upgrade:status", "Show current deployment status for a contract")
  .addParam("contract", `Contract to check (${CONTRACT_IDS.join(", ")})`, undefined, types.string)
  .setAction(async (args: StatusTaskArgs, hre: HardhatRuntimeEnvironment) => {
    const { contract: contractId } = args;
    const network = hre.network.name as SupportedNetwork;

    log.header(`STATUS: ${contractId} on ${network}`);

    if (!CONTRACT_IDS.includes(contractId as ContractId)) {
      log.error(`Invalid contract: ${contractId}`);
      return;
    }

    const contractDef = getContractDefinition(contractId);
    const deployment = getNetworkDeployment(contractId, network);
    const governance = getGovernanceConfig(network);

    console.log("\n📋 Contract Info");
    console.log("─".repeat(60));
    log.detail("Source", contractDef.source);
    log.detail("Type", contractDef.type);

    if (!deployment) {
      log.warning(`Not deployed on ${network}`);
      return;
    }

    const currentVersion = deployment.currentVersion;
    const proxyAddress = deployment.proxy || deployment.address;
    const implAddress = deployment.currentImpl;
    const versionInfo = currentVersion ? getVersionInfo(contractId, currentVersion) : null;

    console.log("\n🔗 Deployment");
    console.log("─".repeat(60));
    log.detail("Proxy", proxyAddress || "N/A");
    log.detail("Implementation", implAddress || "N/A");
    log.detail("Current version", currentVersion || "N/A");
    if (proxyAddress) {
      log.detail("Explorer", `${getExplorerUrl(network)}/address/${proxyAddress}`);
    }

    if (versionInfo) {
      console.log("\n📌 Version Info");
      console.log("─".repeat(60));
      log.detail("Changelog", versionInfo.changelog);
      log.detail("Initializer", versionInfo.initializerFunction);
      log.detail("Git tag", versionInfo.gitTag);
    }

    console.log("\n🔐 Governance");
    console.log("─".repeat(60));
    log.detail("Security multisig", governance.securityMultisig || "Not configured");
    log.detail("Security threshold", governance.securityThreshold);
    log.detail("Operations multisig", governance.operationsMultisig || "Not configured");
    log.detail("Operations threshold", governance.operationsThreshold);

    // Check on-chain state if connected
    if (proxyAddress && contractDef.type === "uups-proxy") {
      try {
        const proxy = await hre.ethers.getContractAt(contractDef.source, proxyAddress);

        console.log("\n⛓️ On-Chain State");
        console.log("─".repeat(60));

        // Try to read version
        try {
          const onChainVersion = await proxy.version();
          log.detail("On-chain version", onChainVersion);
        } catch {
          log.detail("On-chain version", "N/A");
        }

        // Check role holders
        try {
          const SECURITY_ROLE = await proxy.SECURITY_ROLE();
          const OPERATIONS_ROLE = await proxy.OPERATIONS_ROLE();
          log.detail("SECURITY_ROLE", shortenAddress(SECURITY_ROLE));
          log.detail("OPERATIONS_ROLE", shortenAddress(OPERATIONS_ROLE));
        } catch {
          // Not all contracts have these
        }
      } catch (error) {
        log.warning(`Could not read on-chain state: ${error}`);
      }
    }

    console.log("\n");
  });

export {};
