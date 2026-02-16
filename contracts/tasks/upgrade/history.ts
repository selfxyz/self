/**
 * upgrade:history task
 *
 * Shows deployment history for a contract.
 */

import { task, types } from "hardhat/config";
import { log, readRegistry, getContractDefinition, compareVersions, shortenAddress } from "./utils";
import { CONTRACT_IDS, ContractId } from "./types";

interface HistoryTaskArgs {
  contract: ContractId;
}

task("upgrade:history", "Show deployment history for a contract")
  .addParam("contract", `Contract to show history for (${CONTRACT_IDS.join(", ")})`, undefined, types.string)
  .setAction(async (args: HistoryTaskArgs) => {
    const { contract: contractId } = args;

    log.header(`DEPLOYMENT HISTORY: ${contractId}`);

    if (!CONTRACT_IDS.includes(contractId as ContractId)) {
      log.error(`Invalid contract: ${contractId}`);
      return;
    }

    const registry = readRegistry();
    const contractDef = getContractDefinition(contractId);
    const versions = registry.versions[contractId] || {};

    // Contract info
    console.log("\n📋 Contract Information");
    console.log("─".repeat(60));
    log.detail("Source", contractDef.source);
    log.detail("Type", contractDef.type);
    log.detail("Description", contractDef.description);

    // Network deployments
    console.log("\n🔗 Network Deployments");
    console.log("─".repeat(60));

    for (const [networkName, networkConfig] of Object.entries(registry.networks)) {
      const deployment = networkConfig.deployments[contractId];
      if (deployment) {
        const address = deployment.proxy || deployment.address || "Not deployed";
        const version = deployment.currentVersion || "N/A";
        console.log(`  ${networkName.padEnd(15)} ${shortenAddress(address).padEnd(15)} v${version}`);
      }
    }

    // Version history
    console.log("\n📜 Version History");
    console.log("─".repeat(60));

    const versionNumbers = Object.keys(versions).sort((a, b) => compareVersions(b, a));

    if (versionNumbers.length === 0) {
      console.log("  No versions recorded");
    }

    for (const version of versionNumbers) {
      const info = versions[version];
      const isCurrent = Object.values(registry.networks).some(
        (n) => n.deployments[contractId]?.currentVersion === version,
      );

      console.log(`\n  ${isCurrent ? "→" : " "} v${version} (Initializer v${info.initializerVersion})`);
      if (isCurrent) {
        console.log("      CURRENT");
      }
      console.log("      " + "─".repeat(50));
      console.log(`      Changelog:    ${info.changelog}`);
      console.log(`      Initializer:  ${info.initializerFunction}()`);
      console.log(`      Git tag:      ${info.gitTag}`);

      // Show deployments per network
      if (info.deployments && Object.keys(info.deployments).length > 0) {
        console.log("      Deployments:");
        for (const [network, deployment] of Object.entries(info.deployments)) {
          if (deployment.impl) {
            const date = deployment.deployedAt ? new Date(deployment.deployedAt).toLocaleString() : "Unknown";
            console.log(`        ${network}: ${shortenAddress(deployment.impl)} (${date})`);
          }
        }
      }
    }

    console.log("\n");
  });

export {};
