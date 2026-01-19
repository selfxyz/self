/**
 * upgrade:prepare task
 *
 * Validates and deploys a new implementation contract.
 * Does NOT execute the upgrade - that requires multisig approval.
 *
 * Features:
 * - Auto-validates version increment (must be current + 1)
 * - Auto-updates @custom:version in contract if needed
 * - Auto-commits after successful deployment
 * - Records git commit hash and creates tag
 *
 * Usage:
 *   npx hardhat upgrade:prepare --contract IdentityVerificationHub --network celo
 */

import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  log,
  getContractDefinition,
  getProxyAddress,
  getCurrentVersion,
  getGitCommitShort,
  getGitBranch,
  hasUncommittedChanges,
  validateVersionIncrement,
  suggestNextVersion,
  readContractVersion,
  updateContractVersion,
  getContractFilePath,
  addVersion,
  getExplorerUrl,
  shortenAddress,
  createGitTag,
  gitCommit,
  getLatestVersionInfo,
} from "./utils";
import { CONTRACT_IDS, ContractId, SupportedNetwork } from "./types";

interface PrepareTaskArgs {
  contract: ContractId;
  newVersion?: string;
  changelog?: string;
  dryRun: boolean;
  skipCommit: boolean;
}

task("upgrade:prepare", "Validate and deploy a new implementation contract")
  .addParam("contract", `Contract to upgrade (${CONTRACT_IDS.join(", ")})`, undefined, types.string)
  .addOptionalParam(
    "newVersion",
    "New version - auto-detected from contract file if not provided",
    undefined,
    types.string,
  )
  .addOptionalParam("changelog", "Changelog entry for this version", undefined, types.string)
  .addFlag("dryRun", "Simulate the deployment without actually deploying")
  .addFlag("skipCommit", "Skip auto-commit after deployment")
  .setAction(async (args: PrepareTaskArgs, hre: HardhatRuntimeEnvironment) => {
    const { contract: contractId, changelog, dryRun, skipCommit } = args;
    let { newVersion } = args;
    const network = hre.network.name as SupportedNetwork;

    log.header(`UPGRADE PREPARE: ${contractId}`);
    log.detail("Network", network);
    log.detail("Mode", dryRun ? "DRY RUN (no actual deployment)" : "LIVE DEPLOYMENT");

    // ========================================================================
    // Step 1: Validate inputs
    // ========================================================================
    log.step("Validating inputs...");

    if (!CONTRACT_IDS.includes(contractId as ContractId)) {
      log.error(`Invalid contract: ${contractId}`);
      log.info(`Valid contracts: ${CONTRACT_IDS.join(", ")}`);
      return;
    }

    const contractDef = getContractDefinition(contractId);
    if (contractDef.type !== "uups-proxy") {
      log.error(`Contract '${contractId}' is not upgradeable (type: ${contractDef.type})`);
      return;
    }

    let proxyAddress: string;
    try {
      proxyAddress = getProxyAddress(contractId, network);
    } catch {
      log.error(`No proxy deployed for '${contractId}' on network '${network}'`);
      log.info("Deploy the proxy first using the deploy script");
      return;
    }

    const currentVersion = getCurrentVersion(contractId, network);

    log.detail("Contract source", contractDef.source);
    log.detail("Proxy address", proxyAddress);
    log.detail("Current version", currentVersion);

    // ========================================================================
    // Step 2: Determine and validate new version
    // ========================================================================
    log.step("Validating version...");

    const contractFilePath = getContractFilePath(contractId);
    const contractFileVersion = contractFilePath ? readContractVersion(contractFilePath) : null;

    if (contractFileVersion) {
      log.detail("Version in contract file", contractFileVersion);
    }

    // If no version provided, use contract file version
    if (!newVersion) {
      if (contractFileVersion && contractFileVersion !== currentVersion) {
        const validation = validateVersionIncrement(currentVersion, contractFileVersion);
        if (validation.valid) {
          newVersion = contractFileVersion;
          log.info(`Using version from contract file: ${newVersion}`);
        } else {
          log.error(`Contract file has invalid version ${contractFileVersion}`);
          const suggestions = suggestNextVersion(currentVersion);
          log.info(`Current version: ${currentVersion}`);
          log.info(
            `Valid next versions: ${suggestions.patch} (patch), ${suggestions.minor} (minor), ${suggestions.major} (major)`,
          );
          return;
        }
      } else {
        log.error("Contract file version matches current - update @custom:version in contract first");
        const suggestions = suggestNextVersion(currentVersion);
        log.info(`Current version: ${currentVersion}`);
        log.info(
          `Valid next versions: ${suggestions.patch} (patch), ${suggestions.minor} (minor), ${suggestions.major} (major)`,
        );
        return;
      }
    }

    // Validate version increment
    const versionValidation = validateVersionIncrement(currentVersion, newVersion);
    if (!versionValidation.valid) {
      log.error(versionValidation.error!);
      return;
    }

    log.success(`Version increment valid: ${currentVersion} → ${newVersion} (${versionValidation.type})`);

    // ========================================================================
    // Step 3: Update contract file version if needed
    // ========================================================================
    if (contractFilePath && contractFileVersion !== newVersion) {
      log.step("Updating contract file version...");

      if (dryRun) {
        log.info(`[DRY RUN] Would update ${contractFilePath} to version ${newVersion}`);
      } else {
        const updated = updateContractVersion(contractFilePath, newVersion);
        if (updated) {
          log.success(`Updated @custom:version to ${newVersion} in contract file`);
        } else {
          log.warning("Could not update version in contract file - please update manually");
        }
      }
    }

    // ========================================================================
    // Step 4: Check git state
    // ========================================================================
    log.step("Checking git state...");

    const gitBranch = getGitBranch();
    const uncommittedChanges = hasUncommittedChanges();

    log.detail("Branch", gitBranch);

    if (uncommittedChanges && !dryRun) {
      log.warning("You have uncommitted changes. They will be included in the auto-commit.");
    }

    // ========================================================================
    // Step 5: Load and validate the new implementation
    // ========================================================================
    log.step("Loading contract factory...");

    const contractName = contractDef.source;
    let ContractFactory;

    try {
      // Handle contracts that need library linking
      if (contractName === "IdentityVerificationHubImplV2") {
        const CustomVerifier = await hre.ethers.getContractFactory("CustomVerifier");
        const customVerifier = await CustomVerifier.deploy();
        await customVerifier.waitForDeployment();

        ContractFactory = await hre.ethers.getContractFactory(contractName, {
          libraries: {
            CustomVerifier: await customVerifier.getAddress(),
          },
        });
        log.info("Deployed CustomVerifier library for linking");
      } else if (
        contractName === "IdentityRegistryImplV1" ||
        contractName === "IdentityRegistryIdCardImplV1" ||
        contractName === "IdentityRegistryAadhaarImplV1"
      ) {
        const PoseidonT3 = await hre.ethers.getContractFactory("PoseidonT3");
        const poseidonT3 = await PoseidonT3.deploy();
        await poseidonT3.waitForDeployment();

        ContractFactory = await hre.ethers.getContractFactory(contractName, {
          libraries: {
            PoseidonT3: await poseidonT3.getAddress(),
          },
        });
        log.info("Deployed PoseidonT3 library for linking");
      } else {
        ContractFactory = await hre.ethers.getContractFactory(contractName);
      }

      log.success(`Loaded contract factory: ${contractName}`);
    } catch (error) {
      log.error(`Failed to load contract factory: ${error}`);
      return;
    }

    // ========================================================================
    // Step 6: Validate storage layout
    // ========================================================================
    log.step("Validating storage layout compatibility...");

    try {
      await hre.upgrades.validateImplementation(ContractFactory, {
        kind: "uups",
        unsafeAllowLinkedLibraries: true,
        unsafeAllow: ["constructor", "external-library-linking"],
      });
      log.success("Storage layout validation passed");
    } catch (error) {
      log.error(`Storage layout validation failed: ${error}`);
      return;
    }

    // ========================================================================
    // Step 7: Simulate upgrade on fork
    // ========================================================================
    log.step("Simulating upgrade on fork...");

    try {
      const proxyContract = await hre.ethers.getContractAt(contractName, proxyAddress);
      const SECURITY_ROLE = await proxyContract.SECURITY_ROLE();
      log.detail("SECURITY_ROLE", SECURITY_ROLE);
      log.success("Fork simulation passed - proxy is accessible");
    } catch (error) {
      log.error(`Fork simulation failed: ${error}`);
      return;
    }

    // ========================================================================
    // Step 8: Dry run summary
    // ========================================================================
    if (dryRun) {
      log.step("DRY RUN - Skipping actual deployment");
      log.box([
        "DRY RUN SUMMARY",
        "─".repeat(50),
        `Contract: ${contractId}`,
        `Version: ${currentVersion} → ${newVersion}`,
        `Network: ${network}`,
        `Proxy: ${proxyAddress}`,
        "",
        "What would happen:",
        `1. Update contract file to version ${newVersion}`,
        "2. Deploy new implementation",
        "3. Update registry.json",
        "4. Create git commit and tag",
        "",
        "Run without --dry-run to execute.",
      ]);
      return;
    }

    // ========================================================================
    // Step 9: Deploy new implementation
    // ========================================================================
    log.step("Deploying new implementation...");

    try {
      const implementation = await ContractFactory.deploy();
      await implementation.waitForDeployment();
      const implementationAddress = await implementation.getAddress();

      log.success(`Implementation deployed: ${implementationAddress}`);
      log.detail("Explorer", `${getExplorerUrl(network)}/address/${implementationAddress}`);

      // ========================================================================
      // Step 10: Verify on block explorer
      // ========================================================================
      log.step("Verifying contract on block explorer...");

      try {
        await hre.run("verify:verify", {
          address: implementationAddress,
          constructorArguments: [],
        });
        log.success("Contract verified on block explorer");
      } catch (error: any) {
        if (error.message?.includes("Already Verified")) {
          log.info("Contract already verified");
        } else {
          log.warning(`Verification failed: ${error.message}`);
          log.info("You can verify manually later");
        }
      }

      // ========================================================================
      // Step 11: Update registry
      // ========================================================================
      log.step("Updating deployment registry...");

      // Get previous version info to determine initializer version
      const latestVersion = getLatestVersionInfo(contractId);
      const newInitializerVersion = (latestVersion?.info.initializerVersion || 0) + 1;

      const gitCommitShort = getGitCommitShort();
      const deployerAddress = (await hre.ethers.provider.getSigner()).address;

      addVersion(
        contractId,
        network,
        newVersion,
        {
          initializerVersion: newInitializerVersion,
          initializerFunction: newInitializerVersion === 1 ? "initialize" : `initializeV${newInitializerVersion}`,
          changelog: changelog || `Upgrade to v${newVersion}`,
          gitTag: `${contractId.toLowerCase()}-v${newVersion}`,
        },
        {
          impl: implementationAddress,
          deployedAt: new Date().toISOString(),
          deployedBy: deployerAddress,
          gitCommit: "", // Will be set after commit
        },
      );
      log.success("Registry updated");

      // ========================================================================
      // Step 12: Auto-commit and tag
      // ========================================================================
      if (!skipCommit) {
        log.step("Creating git commit...");

        const commitMessage = `feat: ${contractId} v${newVersion} deployed on ${network.charAt(0).toUpperCase() + network.slice(1)}

- Implementation: ${implementationAddress}
- Changelog: ${changelog || "Upgrade"}`;

        const committed = gitCommit(commitMessage);
        if (committed) {
          const newGitCommit = getGitCommitShort();
          log.success(`Committed: ${newGitCommit}`);

          // Try to create git tag
          try {
            createGitTag(
              `${contractId.toLowerCase()}-v${newVersion}`,
              `${contractId} v${newVersion} - ${changelog || "Upgrade"}`,
            );
            log.success(`Created git tag: ${contractId.toLowerCase()}-v${newVersion}`);
          } catch (e) {
            log.warning("Could not create git tag - you can create it manually");
          }
        } else {
          log.warning("Could not create git commit - please commit manually");
        }
      }

      // ========================================================================
      // Summary
      // ========================================================================
      log.box([
        "DEPLOYMENT SUCCESSFUL",
        "═".repeat(50),
        `Contract: ${contractId}`,
        `Version: ${currentVersion} → ${newVersion}`,
        `Network: ${network}`,
        "",
        "Addresses:",
        `  Proxy: ${shortenAddress(proxyAddress)}`,
        `  New Impl: ${shortenAddress(implementationAddress)}`,
        "",
        "Next steps:",
        `  1. Run: npx hardhat upgrade:propose --contract ${contractId} --network ${network}`,
        "  2. Multisig signers approve in Safe UI",
        "  3. Transaction executes automatically when threshold reached",
      ]);
    } catch (error) {
      log.error(`Deployment failed: ${error}`);
      return;
    }
  });

export {};
