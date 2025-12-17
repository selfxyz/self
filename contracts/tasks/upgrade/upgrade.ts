/**
 * upgrade task
 *
 * Combined task that handles the full upgrade workflow:
 * 1. Validates and deploys new implementation
 * 2. Creates Safe proposal for multisig approval
 *
 * Smart behavior:
 * - If caller IS a multisig signer → auto-creates Safe proposal
 * - If caller is NOT a signer → outputs data + URL for manual submission
 *
 * Usage:
 *   npx hardhat upgrade --contract DummyContract --network sepolia
 *   npx hardhat upgrade --contract DummyContract --network sepolia --prepare-only
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
  getContractFilePath,
  addVersion,
  updateVersionGitCommit,
  getExplorerUrl,
  shortenAddress,
  createGitTag,
  gitCommit,
  getLatestVersionInfo,
  getVersionInfo,
  getGovernanceConfig,
  validateReinitializerVersion,
} from "./utils";
import { execSync } from "child_process";
import * as readline from "readline";
import { CONTRACT_IDS, ContractId, SupportedNetwork } from "./types";

/**
 * Prompt user for yes/no confirmation
 */
async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

/**
 * Network configuration - single source of truth
 */
const CHAIN_CONFIG: Record<SupportedNetwork, { chainId: number; safePrefix: string }> = {
  celo: { chainId: 42220, safePrefix: "celo" },
  "celo-sepolia": { chainId: 44787, safePrefix: "celo" },
  sepolia: { chainId: 11155111, safePrefix: "sep" },
  localhost: { chainId: 31337, safePrefix: "eth" },
};

function getChainId(network: SupportedNetwork): number {
  return CHAIN_CONFIG[network]?.chainId || 0;
}

function getChainPrefix(network: SupportedNetwork): string {
  return CHAIN_CONFIG[network]?.safePrefix || network;
}

/**
 * Check if address is a Safe owner and propose transaction if so
 * Uses Safe SDK as documented at:
 * https://docs.safe.global/core-api/transaction-service-guides/transactions
 */
async function checkOwnerAndPropose(
  safeAddress: string,
  signerAddress: string,
  to: string,
  data: string,
  network: SupportedNetwork,
  hre: HardhatRuntimeEnvironment,
): Promise<{ isOwner: boolean; proposed: boolean; safeTxHash?: string; error?: string }> {
  try {
    // Dynamic import Safe SDK
    const SafeApiKit = require("@safe-global/api-kit").default;
    const Safe = require("@safe-global/protocol-kit").default;

    const chainId = BigInt(getChainId(network));

    if (network === "localhost") {
      return { isOwner: false, proposed: false, error: "No Safe service for localhost" };
    }

    // Get Safe Transaction Service URL for the network
    const txServiceUrls: Record<string, string> = {
      sepolia: "https://safe-transaction-sepolia.safe.global/api",
      celo: "https://safe-transaction-celo.safe.global/api",
      "celo-sepolia": "https://safe-transaction-celo.safe.global/api",
    };

    const txServiceUrl = txServiceUrls[network];
    if (!txServiceUrl) {
      return { isOwner: false, proposed: false, error: `No Safe Transaction Service URL for ${network}` };
    }

    // Initialize API Kit with explicit service URL (no API key needed)
    const apiKit = new SafeApiKit({ chainId, txServiceUrl });

    // Check if signer is owner
    let safeInfo;
    try {
      safeInfo = await apiKit.getSafeInfo(safeAddress);
    } catch (e: any) {
      // The Safe might not be indexed yet - this is common for new Safes
      const errorMsg = e.message || String(e);
      if (errorMsg.includes("Not Found") || errorMsg.includes("404")) {
        return {
          isOwner: false,
          proposed: false,
          error: `Safe not indexed by Transaction Service yet. This is normal for new Safes - please submit manually.`,
        };
      }
      return { isOwner: false, proposed: false, error: `Could not fetch Safe info: ${errorMsg}` };
    }

    const isOwner = safeInfo.owners.map((o: string) => o.toLowerCase()).includes(signerAddress.toLowerCase());

    if (!isOwner) {
      return { isOwner: false, proposed: false };
    }

    // Signer IS an owner - try to propose
    try {
      // Get RPC URL and private key from hardhat config
      const networkConfig = hre.config.networks[network] as any;
      const rpcUrl = networkConfig?.url || `http://127.0.0.1:8545`;

      // Extract private key from network config
      let privateKey: string | undefined;
      if (networkConfig?.accounts) {
        if (Array.isArray(networkConfig.accounts) && networkConfig.accounts.length > 0) {
          // accounts: [PRIVATE_KEY]
          privateKey = networkConfig.accounts[0];
        } else if (typeof networkConfig.accounts === "object" && networkConfig.accounts.mnemonic) {
          // accounts: { mnemonic: "..." } - can't easily extract, skip auto-propose
          return {
            isOwner: true,
            proposed: false,
            error: "Mnemonic accounts not supported for auto-propose. Please submit manually.",
          };
        }
      }

      if (!privateKey) {
        return {
          isOwner: true,
          proposed: false,
          error: "Could not extract private key from Hardhat config. Please submit manually.",
        };
      }

      // Ensure private key has 0x prefix
      if (!privateKey.startsWith("0x")) {
        privateKey = `0x${privateKey}`;
      }

      // Initialize Protocol Kit with private key for signing
      const protocolKit = await Safe.init({
        provider: rpcUrl,
        signer: privateKey, // Use private key, not address!
        safeAddress,
      });

      // Create Safe transaction
      const safeTransaction = await protocolKit.createTransaction({
        transactions: [{ to, value: "0", data }],
      });

      // Get transaction hash and sign
      const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
      const signature = await protocolKit.signHash(safeTxHash);

      // Propose transaction to Safe Transaction Service
      await apiKit.proposeTransaction({
        safeAddress,
        safeTransactionData: safeTransaction.data,
        safeTxHash,
        senderAddress: signerAddress,
        senderSignature: signature.data,
      });

      return { isOwner: true, proposed: true, safeTxHash };
    } catch (e: any) {
      return { isOwner: true, proposed: false, error: e.message };
    }
  } catch (e: any) {
    return { isOwner: false, proposed: false, error: e.message };
  }
}

interface UpgradeTaskArgs {
  contract: ContractId;
  changelog?: string;
  dryRun: boolean;
  prepareOnly: boolean;
  skipCommit: boolean;
}

task("upgrade", "Deploy new implementation and create Safe proposal for upgrade")
  .addParam("contract", `Contract to upgrade (${CONTRACT_IDS.join(", ")})`, undefined, types.string)
  .addOptionalParam("changelog", "Changelog entry for this version", undefined, types.string)
  .addFlag("dryRun", "Simulate without deploying or proposing")
  .addFlag("prepareOnly", "Only deploy implementation, skip Safe proposal")
  .addFlag("skipCommit", "Skip auto-commit after deployment")
  .setAction(async (args: UpgradeTaskArgs, hre: HardhatRuntimeEnvironment) => {
    const { contract: contractId, changelog, dryRun, prepareOnly, skipCommit } = args;
    const network = hre.network.name as SupportedNetwork;

    log.header(`UPGRADE: ${contractId}`);
    log.detail("Network", network);
    log.detail("Mode", dryRun ? "DRY RUN" : prepareOnly ? "PREPARE ONLY" : "FULL UPGRADE");

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

    let newVersion: string;
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

    // Validate version increment
    const versionValidation = validateVersionIncrement(currentVersion, newVersion);
    if (!versionValidation.valid) {
      log.error(versionValidation.error!);
      return;
    }

    log.success(`Version increment valid: ${currentVersion} → ${newVersion} (${versionValidation.type})`);

    // ========================================================================
    // Step 3: Validate reinitializer version
    // ========================================================================
    log.step("Checking reinitializer version...");

    // Check if target version already exists in registry
    const targetVersionInfo = getVersionInfo(contractId, newVersion);
    const latestVersionInfo = getLatestVersionInfo(contractId);

    // If target version exists, use its initializerVersion; otherwise increment latest
    const expectedInitializerVersion = targetVersionInfo
      ? targetVersionInfo.initializerVersion
      : (latestVersionInfo?.info.initializerVersion || 0) + 1;

    if (contractFilePath) {
      const reinitValidation = validateReinitializerVersion(contractFilePath, expectedInitializerVersion);

      if (!reinitValidation.valid) {
        log.error(reinitValidation.error!);
        log.box([
          "REINITIALIZER VERSION MISMATCH",
          "═".repeat(50),
          "",
          `Expected: reinitializer(${expectedInitializerVersion})`,
          reinitValidation.actual !== null ? `Found: reinitializer(${reinitValidation.actual})` : "Found: none",
          "",
          "The initialize function must use the correct reinitializer version.",
          "Each upgrade should increment the version by 1.",
          "",
          "Example pattern:",
          `  function initialize(...) external reinitializer(${expectedInitializerVersion}) {`,
          "    // initialization logic",
          "  }",
        ]);
        return;
      }

      log.success(`Reinitializer version correct: reinitializer(${reinitValidation.actual})`);
    } else {
      log.warning("Could not locate contract file - skipping reinitializer check");
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
    // Step 5: Clear cache and compile fresh
    // ========================================================================
    log.step("Clearing cache and compiling fresh...");

    try {
      execSync("npx hardhat clean", { cwd: process.cwd(), stdio: "pipe" });
      log.info("Cache cleared");
      execSync("npx hardhat compile", { cwd: process.cwd(), stdio: "pipe" });
      log.info("Contracts compiled");
    } catch (e: any) {
      log.warning(`Cache/compile issue: ${e.message?.slice(0, 100) || "unknown"}`);
    }

    // ========================================================================
    // Step 6: Load and validate the new implementation
    // ========================================================================
    log.step("Loading contract factory...");

    const contractName = contractDef.source;
    let ContractFactory;

    try {
      if (contractName === "IdentityVerificationHubImplV2") {
        const CustomVerifier = await hre.ethers.getContractFactory("CustomVerifier");
        const customVerifier = await CustomVerifier.deploy();
        await customVerifier.waitForDeployment();

        ContractFactory = await hre.ethers.getContractFactory(contractName, {
          libraries: { CustomVerifier: await customVerifier.getAddress() },
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
          libraries: { PoseidonT3: await poseidonT3.getAddress() },
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
    // Step 7: Validate storage layout
    // ========================================================================
    log.step("Validating storage layout compatibility...");

    // Track if we're using unsafe options (they print warnings)
    const usingUnsafeOptions = true; // We use unsafeAllow: ["constructor"]

    try {
      await hre.upgrades.validateImplementation(ContractFactory, {
        kind: "uups",
        unsafeAllowLinkedLibraries: true,
        unsafeAllow: ["constructor", "external-library-linking"],
      });
      log.success("Storage layout validation passed");

      // If we used unsafe options, prompt user to confirm
      if (usingUnsafeOptions && !dryRun) {
        log.warning("⚠️  Using unsafeAllow flags (constructor, external-library-linking)");
        log.info("This is expected for contracts with _disableInitializers() in constructor.");
        const proceed = await promptYesNo("Continue with deployment?");
        if (!proceed) {
          log.info("Upgrade cancelled by user.");
          return;
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);

      // Check if it's a critical error vs a warning
      const isCritical =
        errorMsg.includes("is not upgrade safe") ||
        errorMsg.includes("storage layout") ||
        errorMsg.includes("deleted") ||
        errorMsg.includes("renamed") ||
        errorMsg.includes("changed type");

      if (isCritical) {
        log.error("❌ CRITICAL: Storage layout validation FAILED");
        log.box([
          "UPGRADE BLOCKED - CRITICAL ISSUE DETECTED",
          "═".repeat(50),
          "",
          "The new contract version has incompatible storage changes.",
          "Deploying this would CORRUPT existing contract state.",
          "",
          "Error details:",
          errorMsg.slice(0, 500),
          "",
          "Common causes:",
          "• Removed or renamed storage variables",
          "• Changed variable types",
          "• Reordered storage variables",
          "",
          "Fix: Review storage layout and ensure backwards compatibility.",
          "See: https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable",
        ]);
        return;
      }

      // It's a warning - prompt user
      log.warning("⚠️  Storage layout validation has warnings:");
      console.log(`\n${errorMsg}\n`);

      const proceed = await promptYesNo("Continue despite warnings?");
      if (!proceed) {
        log.info("Upgrade cancelled by user.");
        return;
      }
      log.warning("Proceeding with warnings - ensure you understand the risks!");
    }

    // ========================================================================
    // Step 8: Dry run summary
    // ========================================================================
    if (dryRun) {
      log.step("DRY RUN - Skipping deployment and proposal");
      log.box(
        [
          "DRY RUN SUMMARY",
          "─".repeat(50),
          `Contract: ${contractId}`,
          `Version: ${currentVersion} → ${newVersion}`,
          `Network: ${network}`,
          `Proxy: ${proxyAddress}`,
          "",
          "What would happen:",
          "1. Deploy new implementation contract",
          "2. Update registry.json",
          "3. Create git commit and tag",
          prepareOnly ? "" : "4. Create Safe proposal for multisig approval",
          "",
          "Run without --dry-run to execute.",
        ].filter(Boolean),
      );
      return;
    }

    // ========================================================================
    // Step 9: Check if implementation actually changed
    // ========================================================================
    log.step("Checking if implementation bytecode changed...");

    try {
      const currentImplAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
      const currentBytecode = await hre.ethers.provider.getCode(currentImplAddress);
      const newBytecode = ContractFactory.bytecode;

      // Compare bytecode (excluding constructor args and metadata)
      // We compare the first 80% as metadata hash at end can differ
      const compareLength = Math.floor(Math.min(currentBytecode.length, newBytecode.length) * 0.8);
      const currentCompare = currentBytecode.slice(0, compareLength);
      const newCompare = newBytecode.slice(0, compareLength);

      if (currentCompare === newCompare) {
        log.warning("⚠️  New implementation bytecode appears identical to current!");
        log.info(`Current impl: ${currentImplAddress}`);
        const proceed = await promptYesNo("Deploy anyway?");
        if (!proceed) {
          log.info("Upgrade cancelled - no changes to deploy.");
          return;
        }
      } else {
        log.success("Bytecode changed - proceeding with deployment");
      }
    } catch (e: any) {
      log.info(`Could not compare bytecode: ${e.message} - proceeding with deployment`);
    }

    // ========================================================================
    // Step 10: Deploy new implementation
    // ========================================================================
    log.step("Deploying new implementation...");

    let implementationAddress: string;
    try {
      const implementation = await ContractFactory.deploy();
      await implementation.waitForDeployment();
      implementationAddress = await implementation.getAddress();

      log.success(`Implementation deployed: ${implementationAddress}`);
      log.detail("Explorer", `${getExplorerUrl(network)}/address/${implementationAddress}`);
    } catch (error) {
      log.error(`Deployment failed: ${error}`);
      return;
    }

    // ========================================================================
    // Step 11: Verify on block explorer
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
    // Step 12: Update registry
    // ========================================================================
    log.step("Updating deployment registry...");

    const latestVersion = getLatestVersionInfo(contractId);
    const newInitializerVersion = (latestVersion?.info.initializerVersion || 0) + 1;
    const deployerAddress = (await hre.ethers.provider.getSigner()).address;

    addVersion(
      contractId,
      network,
      newVersion,
      {
        initializerVersion: newInitializerVersion,
        initializerFunction: "initialize", // Always "initialize" - version tracked via reinitializer(N) modifier
        changelog: changelog || `Upgrade to v${newVersion}`,
        gitTag: `${contractId.toLowerCase()}-v${newVersion}`,
      },
      {
        impl: implementationAddress,
        deployedAt: new Date().toISOString(),
        deployedBy: deployerAddress,
        gitCommit: "",
      },
    );
    log.success("Registry updated");

    // ========================================================================
    // Step 13: Auto-commit and tag
    // ========================================================================
    if (!skipCommit) {
      log.step("Creating git commit...");

      const commitMessage = `feat: ${contractId} v${newVersion} deployed on ${network.charAt(0).toUpperCase() + network.slice(1)}

- Implementation: ${implementationAddress}
- Changelog: ${changelog || "Upgrade"}`;

      const committed = gitCommit(commitMessage);
      if (committed) {
        const newGitCommit = getGitCommitShort();

        // Update registry with the actual commit hash and amend the commit
        try {
          updateVersionGitCommit(contractId, network, newVersion, newGitCommit);
          execSync("git add -A && git commit --amend --no-edit", { cwd: process.cwd(), stdio: "pipe" });
          log.success(`Committed: ${newGitCommit} (with gitCommit in registry)`);
        } catch (e: any) {
          log.warning(`Could not update gitCommit in registry: ${e.message}`);
          log.success(`Committed: ${newGitCommit}`);
        }

        const tagName = `${contractId.toLowerCase()}-v${newVersion}`;
        try {
          // Delete existing tag if it exists (safe - we're creating a new commit anyway)
          try {
            execSync(`git tag -d ${tagName}`, { cwd: process.cwd(), stdio: "pipe" });
            log.info(`Deleted existing tag: ${tagName}`);
          } catch {
            // Tag didn't exist, that's fine
          }

          createGitTag(tagName, `${contractId} v${newVersion} - ${changelog || "Upgrade"}`);
          log.success(`Created git tag: ${tagName}`);
        } catch (e: any) {
          log.warning(`Could not create git tag: ${e.message}`);
        }
      } else {
        log.warning("Could not create git commit - please commit manually");
      }
    } else {
      // If skipping commit, record current HEAD as reference
      const currentCommit = getGitCommitShort();
      if (currentCommit !== "unknown") {
        try {
          updateVersionGitCommit(contractId, network, newVersion, currentCommit);
          log.info(`Recorded current commit reference: ${currentCommit}`);
        } catch {
          // Non-critical, ignore
        }
      }
    }

    // ========================================================================
    // Step 14: Encode initializer and detect governance pattern
    // ========================================================================
    log.step("Encoding upgrade transaction...");

    const proxyContract = await hre.ethers.getContractAt(contractName, proxyAddress);

    // Encode initializer function call
    let initData = "0x";
    const targetVersionInfoForInit = getVersionInfo(contractId, newVersion);
    const initializerName = targetVersionInfoForInit?.initializerFunction || `initializeV${newInitializerVersion}`;

    try {
      const iface = proxyContract.interface;
      const initFragment = iface.getFunction(initializerName);
      if (initFragment && initFragment.inputs.length === 0) {
        initData = iface.encodeFunctionData(initializerName, []);
        log.detail("Initializer", initializerName);
      }
    } catch {
      log.detail("Initializer", "None");
    }

    // Build upgrade transaction data
    const upgradeData = proxyContract.interface.encodeFunctionData("upgradeToAndCall", [
      implementationAddress,
      initData,
    ]);

    // Detect governance pattern
    log.step("Detecting contract governance pattern...");
    let isOwnableContract = false;
    let currentOwner: string | null = null;

    // Check if contract uses Ownable or AccessControl
    try {
      const ownerFragment = proxyContract.interface.getFunction("owner");
      if (ownerFragment) {
        isOwnableContract = true;
        currentOwner = await proxyContract.owner();
        log.info(`Contract uses Ownable pattern - current owner: ${currentOwner}`);
      } else {
        log.info("Contract uses AccessControl pattern");
      }
    } catch (e: any) {
      log.warning(`Could not detect governance pattern: ${e.message}`);
    }

    // ========================================================================
    // Step 15: Handle --prepare-only mode or create Safe proposal
    // ========================================================================
    if (prepareOnly) {
      if (isOwnableContract && currentOwner) {
        log.box([
          "IMPLEMENTATION DEPLOYED - OWNER EXECUTION REQUIRED",
          "═".repeat(70),
          `Contract: ${contractId}`,
          `Version: ${currentVersion} → ${newVersion}`,
          `Network: ${network}`,
          "",
          "Addresses:",
          `  Proxy: ${shortenAddress(proxyAddress)}`,
          `  New Impl: ${shortenAddress(implementationAddress)}`,
          `  Current Owner: ${currentOwner}`,
          "",
          "⚠️  FIRST GOVERNANCE UPGRADE DETECTED",
          "",
          "This contract uses Ownable - the current owner must execute",
          "the upgrade directly. After upgrade, grant SECURITY_ROLE to Safe.",
          "",
          "Transaction Data for Owner Execution:",
          `  To: ${proxyAddress}`,
          `  Data: ${upgradeData}`,
          "",
          "After upgrade completes:",
          "  1. Grant SECURITY_ROLE to security multisig",
          "  2. Grant OPERATIONS_ROLE to operations multisig",
          "  3. Run: npx hardhat run scripts/transferRolesToMultisigs.ts --network " + network,
        ]);
      } else {
        log.box([
          "IMPLEMENTATION DEPLOYED",
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
          "  Run without --prepare-only to create Safe proposal",
          "  Or manually propose via Safe UI",
        ]);
      }
      return;
    }

    log.step("Creating Safe proposal...");

    const governance = getGovernanceConfig(network);
    if (!governance.securityMultisig) {
      log.error(`No security multisig configured for network '${network}'`);
      log.info("Update deployments/registry.json with governance addresses");
      log.info("Implementation deployed - propose manually via Safe UI");
      return;
    }

    log.detail("Security multisig", governance.securityMultisig);
    log.detail("Required threshold", governance.securityThreshold);

    // Check if Safe has SECURITY_ROLE on the proxy
    log.step("Verifying Safe has SECURITY_ROLE...");
    const SECURITY_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("SECURITY_ROLE"));
    let safeHasRole = false;

    if (isOwnableContract) {
      // Contract uses Ownable - owner must execute directly
      log.warning("⚠️  FIRST GOVERNANCE UPGRADE DETECTED");
      log.box([
        "OWNER DIRECT EXECUTION REQUIRED",
        "═".repeat(70),
        "",
        "This is the first upgrade from Ownable to AccessControl.",
        "The Safe cannot execute this upgrade because it doesn't have",
        "the owner role yet.",
        "",
        `Current owner: ${currentOwner}`,
        `Proxy address: ${proxyAddress}`,
        "",
        "Transaction Data for Owner Execution:",
        `  To: ${proxyAddress}`,
        `  Data: ${upgradeData}`,
        "",
        "After upgrade completes:",
        "  1. Grant SECURITY_ROLE to security multisig",
        "  2. Grant OPERATIONS_ROLE to operations multisig",
        "  3. Run: npx hardhat run scripts/transferRolesToMultisigs.ts --network " + network,
        "",
        "Future upgrades can use Safe proposals.",
      ]);
      return;
    }

    // Contract uses AccessControl - check if Safe has SECURITY_ROLE
    try {
      safeHasRole = await proxyContract.hasRole(SECURITY_ROLE, governance.securityMultisig);
      if (!safeHasRole) {
        log.error("❌ SECURITY_ROLE CHECK FAILED");
        log.box([
          "UPGRADE BLOCKED - SAFE MISSING REQUIRED ROLE",
          "═".repeat(50),
          "",
          "The Safe multisig does NOT have SECURITY_ROLE on this contract.",
          "The upgrade transaction will FAIL if submitted.",
          "",
          `Safe address: ${governance.securityMultisig}`,
          `Proxy address: ${proxyAddress}`,
          "",
          "To fix, grant SECURITY_ROLE to the Safe:",
          "",
          "  1. From the current admin account, call:",
          `     contract.grantRole(SECURITY_ROLE, "${governance.securityMultisig}")`,
          "",
          "  2. Or run this script:",
          "     npx hardhat run scripts/grantRoleToSafe.ts --network " + network,
          "",
          "After granting the role, re-run this upgrade command.",
        ]);
        return;
      }
      log.success("Safe has SECURITY_ROLE ✓");
    } catch (e: any) {
      log.warning(`Could not verify SECURITY_ROLE: ${e.message}`);
      log.info("Proceeding anyway - ensure Safe has the role before executing");
    }

    // ========================================================================
    // Step 15: Handle Safe proposal or owner direct execution
    // ========================================================================

    // Skip Safe proposal if this is an Ownable contract (first upgrade)
    if (isOwnableContract) {
      log.step("Skipping Safe proposal - owner must execute directly");
      log.box([
        "OWNER DIRECT EXECUTION REQUIRED",
        "═".repeat(70),
        "",
        "Transaction Data:",
        `  To: ${proxyAddress}`,
        `  Data: ${upgradeData}`,
        "",
        "Execute this transaction from the owner account:",
        `  ${currentOwner}`,
        "",
        "After upgrade completes, grant SECURITY_ROLE to Safe:",
        `  ${governance.securityMultisig || "Not configured"}`,
        "",
        "Future upgrades can use Safe proposals.",
      ]);
      return;
    }

    log.step("Checking if you're a multisig signer...");

    const result = await checkOwnerAndPropose(
      governance.securityMultisig,
      deployerAddress,
      proxyAddress,
      upgradeData,
      network,
      hre,
    );

    if (result.isOwner && result.proposed) {
      // Successfully proposed!
      log.success("You ARE a signer - transaction auto-proposed!");

      const safeUrl = `https://app.safe.global/transactions/queue?safe=${getChainPrefix(network)}:${governance.securityMultisig}`;

      console.log("\n" + "═".repeat(70));
      console.log("  🎉 UPGRADE PROPOSAL SUBMITTED!");
      console.log("═".repeat(70));
      console.log(`  Contract:       ${contractId}`);
      console.log(`  Version:        ${currentVersion} → ${newVersion}`);
      console.log(`  Network:        ${network}`);
      console.log(`  Implementation: ${implementationAddress}`);
      console.log(`  Safe TX Hash:   ${result.safeTxHash}`);
      console.log("═".repeat(70));
      console.log("\n  Next steps:");
      console.log(`  1. Other signers approve at:`);
      console.log(`     ${safeUrl}`);
      console.log(`  2. Once ${governance.securityThreshold} signatures collected → click 'Execute'`);
      console.log("");
    } else if (result.isOwner && !result.proposed) {
      // Owner but failed to propose
      log.warning(`You ARE a signer but auto-propose failed: ${result.error}`);
      log.info("Please submit manually via Safe UI");
      outputManualSubmissionData(
        contractId,
        currentVersion,
        newVersion,
        network,
        implementationAddress,
        governance.securityMultisig,
        governance.securityThreshold,
        proxyAddress,
        upgradeData,
      );
    } else {
      // Not an owner
      if (result.error) {
        log.info(`Could not check Safe ownership: ${result.error}`);
      } else {
        log.info(`You are NOT a signer on the multisig (${shortenAddress(deployerAddress)})`);
      }
      log.info("Please submit manually via Safe UI");
      outputManualSubmissionData(
        contractId,
        currentVersion,
        newVersion,
        network,
        implementationAddress,
        governance.securityMultisig,
        governance.securityThreshold,
        proxyAddress,
        upgradeData,
      );
    }
  });

/**
 * Output data for manual Safe submission
 */
function outputManualSubmissionData(
  contractId: string,
  currentVersion: string,
  newVersion: string,
  network: SupportedNetwork,
  implementationAddress: string,
  safeAddress: string,
  threshold: string,
  proxyAddress: string,
  upgradeData: string,
): void {
  const chainPrefix = getChainPrefix(network);
  const safeUrl = `https://app.safe.global/apps/open?safe=${chainPrefix}:${safeAddress}&appUrl=https%3A%2F%2Fapps-portal.safe.global%2Ftx-builder`;

  console.log("\n");
  console.log("═".repeat(70));
  console.log("  📋 SUBMIT UPGRADE TO SAFE MULTISIG");
  console.log("═".repeat(70));
  console.log(`  Contract: ${contractId}`);
  console.log(`  Version:  ${currentVersion} → ${newVersion}`);
  console.log(`  Network:  ${network}`);
  console.log(`  New Impl: ${implementationAddress}`);
  console.log("═".repeat(70));

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│  STEP 1: Open Safe Transaction Builder                              │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");
  console.log(`\n  ${safeUrl}\n`);

  console.log("┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│  STEP 2: Toggle 'Custom data' switch ON (top right)                 │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│  STEP 3: Enter transaction data                                     │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  console.log("\n  TO ADDRESS:");
  console.log(`  ${proxyAddress}`);

  console.log("\n  ETH VALUE:");
  console.log("  0");

  console.log("\n  DATA (HEX):");
  console.log(`  ${upgradeData}`);

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│  STEP 4: Click '+ Add new transaction'                              │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│  STEP 5: Click 'Create Batch' (green button, right side)            │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│  STEP 6: Click 'Send Batch' → then 'Continue' in the modal          │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│  STEP 7: Sign with your wallet (this adds to queue)                 │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log(`│  STEP 8: Other signers sign (${threshold} required)`.padEnd(70) + "│");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│  STEP 9: Click 'Execute' once all signatures collected              │");
  console.log("└─────────────────────────────────────────────────────────────────────┘");

  console.log("\n" + "═".repeat(70));
  console.log("  Alternative: Use ABI method (if 'Custom data' is OFF)");
  console.log("═".repeat(70));
  console.log("  1. Select 'upgradeToAndCall' from Contract Method Selector");
  console.log(`  2. newImplementation: ${implementationAddress}`);
  console.log("  3. data: 0x");
  console.log("═".repeat(70));
  console.log("");
}

export {};
