/**
 * upgrade:propose task
 *
 * Creates a Safe multisig transaction to execute the upgrade.
 * The implementation must already be deployed via upgrade:prepare.
 *
 * Usage:
 *   npx hardhat upgrade:propose --contract IdentityVerificationHub --network celo
 */

import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  log,
  getContractDefinition,
  getProxyAddress,
  getCurrentVersion,
  getGovernanceConfig,
  getVersionInfo,
  getNetworkDeployment,
} from "./utils";
import { CONTRACT_IDS, ContractId, SupportedNetwork } from "./types";

/**
 * Get Safe chain prefix for URL
 */
function getChainPrefix(network: SupportedNetwork): string {
  const prefixes: Record<SupportedNetwork, string> = {
    celo: "celo",
    "celo-sepolia": "celo",
    sepolia: "sep",
    localhost: "eth",
  };
  return prefixes[network] || network;
}

interface ProposeTaskArgs {
  contract: ContractId;
  dryRun: boolean;
}

task("upgrade:propose", "Create Safe transaction to execute the upgrade")
  .addParam("contract", `Contract to upgrade (${CONTRACT_IDS.join(", ")})`, undefined, types.string)
  .addFlag("dryRun", "Generate transaction data without submitting to Safe")
  .setAction(async (args: ProposeTaskArgs, hre: HardhatRuntimeEnvironment) => {
    const { contract: contractId, dryRun } = args;
    const network = hre.network.name as SupportedNetwork;

    log.header(`UPGRADE PROPOSE: ${contractId}`);
    log.detail("Network", network);
    log.detail("Mode", dryRun ? "DRY RUN (no Safe submission)" : "LIVE SUBMISSION");

    // ========================================================================
    // Step 1: Validate inputs
    // ========================================================================
    log.step("Validating inputs...");

    if (!CONTRACT_IDS.includes(contractId as ContractId)) {
      log.error(`Invalid contract: ${contractId}`);
      return;
    }

    const contractDef = getContractDefinition(contractId);
    if (contractDef.type !== "uups-proxy") {
      log.error(`Contract '${contractId}' is not upgradeable`);
      return;
    }

    let proxyAddress: string;
    try {
      proxyAddress = getProxyAddress(contractId, network);
    } catch {
      log.error(`No proxy deployed for '${contractId}' on '${network}'`);
      return;
    }

    const currentVersion = getCurrentVersion(contractId, network);
    const deployment = getNetworkDeployment(contractId, network);
    const newImplAddress = deployment?.currentImpl;

    if (!newImplAddress) {
      log.error("No implementation deployed. Run upgrade:prepare first.");
      return;
    }

    const versionInfo = getVersionInfo(contractId, currentVersion);

    log.detail("Contract", contractId);
    log.detail("Proxy", proxyAddress);
    log.detail("Current version", currentVersion);
    log.detail("New implementation", newImplAddress);
    log.detail("Changelog", versionInfo?.changelog || "N/A");

    // ========================================================================
    // Step 2: Load governance configuration
    // ========================================================================
    log.step("Loading governance configuration...");

    const governance = getGovernanceConfig(network);
    if (!governance.securityMultisig) {
      log.error(`No security multisig configured for network '${network}'`);
      log.info("Update deployments/registry.json with governance addresses");
      return;
    }

    log.detail("Security multisig", governance.securityMultisig);
    log.detail("Required threshold", governance.securityThreshold);

    // ========================================================================
    // Step 3: Verify implementation contract
    // ========================================================================
    log.step("Verifying implementation contract...");

    const implCode = await hre.ethers.provider.getCode(newImplAddress);
    if (implCode === "0x") {
      log.error(`No contract found at implementation address ${newImplAddress}`);
      return;
    }
    log.success("Implementation contract verified on-chain");

    // ========================================================================
    // Step 4: Build upgrade transaction
    // ========================================================================
    log.step("Building upgrade transaction...");

    const contractName = contractDef.source;
    const proxyContract = await hre.ethers.getContractAt(contractName, proxyAddress);

    // Check if there's an initializer to call
    let initData = "0x";
    const initializerName = versionInfo?.initializerFunction;
    if (initializerName && initializerName !== "initialize") {
      try {
        const iface = proxyContract.interface;
        const initFragment = iface.getFunction(initializerName);
        if (initFragment) {
          initData = iface.encodeFunctionData(initializerName, []);
          log.detail("Initialization", initializerName);
        }
      } catch {
        log.detail("Initialization", "None (function not found)");
      }
    } else {
      log.detail("Initialization", "None");
    }

    // Encode upgradeToAndCall
    const upgradeData = proxyContract.interface.encodeFunctionData("upgradeToAndCall", [newImplAddress, initData]);

    log.detail("Method", "upgradeToAndCall(address,bytes)");
    log.detail("Target", proxyAddress);

    // ========================================================================
    // Step 5: Output transaction data
    // ========================================================================
    if (dryRun) {
      log.step("DRY RUN - Transaction data generated");
    } else {
      log.step("Generating Safe proposal data...");
    }

    const chainPrefix = getChainPrefix(network);

    log.success("Transaction data generated");

    log.box([
      "SAFE PROPOSAL READY",
      "═".repeat(60),
      `Safe: ${governance.securityMultisig}`,
      `Threshold: ${governance.securityThreshold}`,
      "",
      "Transaction:",
      `  To: ${proxyAddress}`,
      "  Value: 0",
      `  Data: ${upgradeData.slice(0, 50)}...`,
      "",
      "Submit via Safe UI:",
      `  1. Go to: https://app.safe.global/home?safe=${chainPrefix}:${governance.securityMultisig}`,
      "  2. Click 'New transaction' → 'Transaction Builder'",
      "  3. Enter: To, Value, Data from above",
      `  4. ${governance.securityThreshold} signers approve`,
      "  5. Upgrade executes automatically!",
    ]);

    // Output raw data for copy-paste
    console.log("\n📋 Raw transaction data (copy this for Transaction Builder):");
    console.log("─".repeat(60));
    console.log(
      JSON.stringify(
        {
          to: proxyAddress,
          value: "0",
          data: upgradeData,
        },
        null,
        2,
      ),
    );
  });

export {};
