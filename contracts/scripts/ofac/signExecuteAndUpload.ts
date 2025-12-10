/**
 * OFAC Update: Sign, Execute, and Upload (Pre-staged for minimal mismatch)
 *
 * This script uses PRE-STAGING to minimize the mismatch window to ~1 second:
 *
 * 1. Upload trees to temp directory (before execution - no impact)
 * 2. Sign the pending Safe transaction
 * 3. Execute the transaction on-chain
 * 4. ATOMICALLY move trees from temp to production (~1 second)
 *
 * Usage:
 *   PRIVATE_KEY=0x... NETWORK=celo npx tsx scripts/ofac/signExecuteAndUpload.ts
 *
 * Required env:
 *   PRIVATE_KEY - Private key of the final signer (must be Safe owner)
 *   NETWORK - Network (celo, celo-sepolia, sepolia)
 *
 * Optional env:
 *   SAFE_ADDRESS - Override default Safe address
 *   TREES_DIR - Path to generated trees (default: ../common/ofacdata/outputs)
 *   SSH_HOST - SSH host for upload (default: self-infra-staging)
 *   UPLOAD_PATH - Remote path for trees
 *   DRY_RUN - Set to 'true' to skip actual execution/upload
 *   SKIP_PRESTAGE - Set to 'true' if files already pre-staged
 */

import Safe from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default RPC URLs (public endpoints)
const DEFAULT_RPC_URLS: Record<string, string> = {
  'celo': 'https://forno.celo.org',
  'celo-sepolia': 'https://celo-sepolia.drpc.org',
  'sepolia': 'https://rpc.sepolia.org',
};

// Network configurations
const NETWORK_CONFIG: Record<string, {
  chainId: bigint;
  txServiceUrl: string;
  rpcEnvVar: string;
  defaultSafe: string;
  uploadPath: string;
}> = {
  'celo': {
    chainId: 42220n,
    txServiceUrl: 'https://safe-transaction-celo.safe.global',
    rpcEnvVar: 'CELO_RPC_URL',
    defaultSafe: '0x067b18e09A10Fa03d027c1D60A098CEbbE5637f0',
    uploadPath: '/home/ec2-user/self-infra/merkle-tree-reader/common/constants/ofac',
  },
  'celo-sepolia': {
    chainId: 11142220n,
    txServiceUrl: 'https://safe-transaction-celo.safe.global',
    rpcEnvVar: 'CELO_SEPOLIA_RPC_URL',
    defaultSafe: '0x067b18e09A10Fa03d027c1D60A098CEbbE5637f0', // Same 2/5 multisig
    uploadPath: '/home/ec2-user/self-infra-staging/merkle-tree-reader/common/constants/ofac',
  },
  'sepolia': {
    chainId: 11155111n,
    txServiceUrl: 'https://safe-transaction-sepolia.safe.global/api',
    rpcEnvVar: 'SEPOLIA_RPC_URL',
    defaultSafe: '0x4264a631c5E685a622b5C8171b5f17BeD7FB30c6', // Test Safe (2/2)
    uploadPath: '/home/ec2-user/ofac-e2e-test', // Test directory
  },
};

// Tree files to upload
const TREE_FILES = [
  'passportNoAndNationalitySMT.json',
  'nameAndDobSMT.json',
  'nameAndYobSMT.json',
  'nameAndDobSMT_ID.json',
  'nameAndYobSMT_ID.json',
  'nameAndDobSMT_AADHAAR.json',
  'nameAndYobSMT_AADHAAR.json',
  'roots.json',
];

function log(msg: string) {
  const timestamp = new Date().toISOString().slice(11, 23);
  console.log(`[${timestamp}] ${msg}`);
}

/**
 * Pre-stage trees to temporary directory on server
 */
function prestageFiles(
  treesDir: string,
  sshHost: string,
  stagingPath: string,
  dryRun: boolean
): boolean {
  log(`📤 PRE-STAGING: Uploading trees to ${sshHost}:${stagingPath}`);

  const filesToUpload = TREE_FILES
    .map(f => path.join(treesDir, f))
    .filter(f => fs.existsSync(f));

  if (filesToUpload.length === 0) {
    log('❌ No tree files found to upload!');
    return false;
  }

  log(`   Found ${filesToUpload.length} files`);

  if (dryRun) {
    log('   [DRY RUN] Would upload:');
    filesToUpload.forEach(f => log(`     - ${path.basename(f)}`));
    return true;
  }

  try {
    // Create staging directory
    execSync(`ssh ${sshHost} "mkdir -p ${stagingPath}"`, { stdio: 'pipe' });

    // Upload all files to staging
    for (const file of filesToUpload) {
      const basename = path.basename(file);
      process.stdout.write(`   Uploading ${basename}...`);
      execSync(`scp "${file}" "${sshHost}:${stagingPath}/"`, { stdio: 'pipe' });
      console.log(' ✓');
    }

    log(`✅ Pre-staged ${filesToUpload.length} files`);
    return true;
  } catch (error) {
    log(`❌ Pre-staging failed: ${error}`);
    return false;
  }
}

/**
 * Atomically move files from staging to production
 * This is the critical ~1 second operation
 */
function atomicMove(
  sshHost: string,
  stagingPath: string,
  productionPath: string,
  dryRun: boolean
): { success: boolean; durationMs: number } {
  log(`⚡ ATOMIC MOVE: ${stagingPath} → ${productionPath}`);

  if (dryRun) {
    log('   [DRY RUN] Would move files');
    return { success: true, durationMs: 0 };
  }

  const startTime = Date.now();

  try {
    // Ensure production directory exists
    execSync(`ssh ${sshHost} "mkdir -p ${productionPath}"`, { stdio: 'pipe' });

    // Atomic move (mv is atomic on same filesystem)
    // Use cp + rm for cross-filesystem safety, but mv is faster
    const moveCmd = `ssh ${sshHost} "mv ${stagingPath}/*.json ${productionPath}/ && rm -rf ${stagingPath}"`;
    execSync(moveCmd, { stdio: 'pipe' });

    const durationMs = Date.now() - startTime;
    log(`✅ Atomic move completed in ${durationMs}ms`);

    return { success: true, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log(`❌ Atomic move failed after ${durationMs}ms: ${error}`);
    return { success: false, durationMs };
  }
}

/**
 * Verify files exist in production
 */
function verifyProduction(sshHost: string, productionPath: string): void {
  log('📋 Verifying production files...');
  try {
    const result = execSync(
      `ssh ${sshHost} "ls -la ${productionPath}/*.json 2>/dev/null | tail -10"`,
      { encoding: 'utf-8' }
    );
    console.log(result);
  } catch {
    log('⚠️  Could not verify (may still be successful)');
  }
}

async function main() {
  console.log('');
  console.log('═'.repeat(70));
  console.log('  OFAC UPDATE: SIGN, EXECUTE & UPLOAD (PRE-STAGED)');
  console.log('═'.repeat(70));
  console.log('');
  console.log('  This script minimizes mismatch window to ~1 second by:');
  console.log('  1. Pre-staging files to temp directory (before execution)');
  console.log('  2. Executing multisig on-chain');
  console.log('  3. Atomically moving files to production');
  console.log('');

  // Parse configuration
  const network = process.env.NETWORK || 'sepolia';
  const config = NETWORK_CONFIG[network];

  if (!config) {
    console.error(`❌ Unknown network: ${network}`);
    console.error(`   Supported: ${Object.keys(NETWORK_CONFIG).join(', ')}`);
    process.exit(1);
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  const rpcUrl = process.env.RPC_URL || process.env[config.rpcEnvVar] || DEFAULT_RPC_URLS[network];
  if (!rpcUrl) {
    console.error(`❌ RPC URL required (set RPC_URL or ${config.rpcEnvVar})`);
    process.exit(1);
  }

  const safeAddress = process.env.SAFE_ADDRESS || config.defaultSafe;
  const treesDir = process.env.TREES_DIR || path.join(__dirname, '../../..', 'common/ofacdata/outputs');
  const sshHost = process.env.SSH_HOST || 'self-infra-staging';
  const productionPath = process.env.UPLOAD_PATH || config.uploadPath;
  const dryRun = process.env.DRY_RUN === 'true';
  const skipPrestage = process.env.SKIP_PRESTAGE === 'true';

  // Generate unique staging path
  const timestamp = Date.now();
  const stagingPath = `/tmp/ofac-prestage-${timestamp}`;

  console.log('Configuration:');
  log(`Network: ${network} (chainId: ${config.chainId})`);
  log(`Safe: ${safeAddress}`);
  log(`Trees: ${treesDir}`);
  log(`SSH Host: ${sshHost}`);
  log(`Staging: ${stagingPath}`);
  log(`Production: ${productionPath}`);
  log(`Dry Run: ${dryRun}`);
  console.log('');

  // Verify trees exist
  const existingTrees = TREE_FILES.filter(f => fs.existsSync(path.join(treesDir, f)));
  if (existingTrees.length === 0) {
    console.error('❌ No tree files found in:', treesDir);
    console.error('   Run the tree builder first:');
    console.error('   npx tsx common/scripts/ofac/index.ts');
    process.exit(1);
  }
  log(`✅ Found ${existingTrees.length} tree files locally`);

  // Get signer address
  const wallet = new ethers.Wallet(privateKey);
  const signerAddress = wallet.address;
  log(`Signer: ${signerAddress}`);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: PRE-STAGE FILES (before any on-chain action)
  // ═══════════════════════════════════════════════════════════════════
  console.log('');
  console.log('─'.repeat(70));
  console.log('  PHASE 1: PRE-STAGE FILES');
  console.log('─'.repeat(70));
  console.log('');

  if (skipPrestage) {
    log('⏭️  Skipping pre-stage (SKIP_PRESTAGE=true)');
  } else {
    const prestageSuccess = prestageFiles(treesDir, sshHost, stagingPath, dryRun);
    if (!prestageSuccess && !dryRun) {
      console.error('');
      console.error('❌ Pre-staging failed. Aborting before any on-chain action.');
      console.error('   Fix SSH access and try again.');
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: SAFE TRANSACTION
  // ═══════════════════════════════════════════════════════════════════
  console.log('');
  console.log('─'.repeat(70));
  console.log('  PHASE 2: SAFE TRANSACTION');
  console.log('─'.repeat(70));
  console.log('');

  // Initialize Safe API Kit
  log('🔗 Connecting to Safe Transaction Service...');
  const apiKit = new SafeApiKit({
    chainId: config.chainId,
    txServiceUrl: config.txServiceUrl,
  });

  // Check if signer is owner
  const safeInfo = await apiKit.getSafeInfo(safeAddress);
  if (!safeInfo.owners.map(o => o.toLowerCase()).includes(signerAddress.toLowerCase())) {
    console.error(`❌ ${signerAddress} is not an owner of Safe ${safeAddress}`);
    console.error(`   Owners: ${safeInfo.owners.join(', ')}`);
    process.exit(1);
  }
  log(`✅ Signer is owner (${safeInfo.threshold}/${safeInfo.owners.length} threshold)`);

  // Get pending transactions
  log('📋 Fetching pending transactions...');
  const pendingTxs = await apiKit.getPendingTransactions(safeAddress);

  if (pendingTxs.count === 0) {
    console.error('❌ No pending transactions found');
    console.error('   First, propose a transaction using prepareMultisigUpdate.ts');
    process.exit(1);
  }

  // Get the most recent pending transaction
  const pendingTx = pendingTxs.results[0];
  const safeTxHash = pendingTx.safeTxHash;
  const existingSignatures = pendingTx.confirmations?.length || 0;

  log(`Found ${pendingTxs.count} pending transaction(s)`);
  log(`Using most recent: ${safeTxHash.slice(0, 18)}...`);
  log(`Current signatures: ${existingSignatures}/${safeInfo.threshold}`);

  // Check if we already signed
  const alreadySigned = pendingTx.confirmations?.some(
    c => c.owner.toLowerCase() === signerAddress.toLowerCase()
  );

  if (alreadySigned) {
    log(`⚠️  You have already signed this transaction`);
  }

  // Initialize Protocol Kit
  log('🔐 Initializing Safe Protocol Kit...');
  const protocolKit = await Safe.init({
    provider: rpcUrl,
    signer: privateKey,
    safeAddress,
  });

  // Sign if not already signed
  if (!alreadySigned) {
    log('✍️  Signing transaction...');

    if (dryRun) {
      log('[DRY RUN] Would sign transaction');
    } else {
      const signature = await protocolKit.signHash(safeTxHash);
      await apiKit.confirmTransaction(safeTxHash, signature.data);
      log('✅ Transaction signed');
    }
  }

  // Check if we can execute
  const updatedTx = await apiKit.getTransaction(safeTxHash);
  const totalSignatures = updatedTx.confirmations?.length || 0;
  const canExecute = totalSignatures >= safeInfo.threshold;

  log(`Total signatures: ${totalSignatures}/${safeInfo.threshold}`);

  if (!canExecute) {
    console.log('');
    console.log('─'.repeat(70));
    log('⏳ Not enough signatures to execute yet');
    log(`   Need ${safeInfo.threshold - totalSignatures} more signature(s)`);
    console.log('');
    log('Files are pre-staged. Run this script again after more signatures.');
    log(`Staging path: ${stagingPath}`);
    process.exit(0);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: EXECUTE ON-CHAIN
  // ═══════════════════════════════════════════════════════════════════
  console.log('');
  console.log('─'.repeat(70));
  console.log('  PHASE 3: EXECUTE ON-CHAIN');
  console.log('─'.repeat(70));
  console.log('');

  let executionSuccess = false;

  if (dryRun) {
    log('[DRY RUN] Would execute transaction');
    executionSuccess = true;
  } else {
    log('🚀 Executing Safe transaction...');

    try {
      // Build the executable transaction with all signatures
      const safeTransaction = await apiKit.getTransaction(safeTxHash);
      const safeTx = await protocolKit.toSafeTransactionType(safeTransaction);

      // Add all confirmations as signatures
      for (const confirmation of updatedTx.confirmations || []) {
        safeTx.addSignature({
          signer: confirmation.owner,
          data: confirmation.signature,
          isContractSignature: false,
        } as any);
      }

      const executeTxResponse = await protocolKit.executeTransaction(safeTx);

      log(`📝 TX Hash: ${executeTxResponse.hash}`);
      log('⏳ Waiting for confirmation...');

      // Wait for the transaction to be mined
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const receipt = await provider.waitForTransaction(executeTxResponse.hash, 1, 120000);

      if (receipt?.status === 1) {
        log('✅ Transaction executed successfully!');
        log(`   Block: ${receipt.blockNumber}`);
        executionSuccess = true;
      } else {
        throw new Error('Transaction failed on-chain');
      }

    } catch (error) {
      console.error('❌ Execution failed:', error);
      console.error('');
      console.error('⚠️  Pre-staged files remain at:', stagingPath);
      console.error('   You can retry execution or clean up manually.');
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 4: ATOMIC MOVE (the critical ~1 second operation)
  // ═══════════════════════════════════════════════════════════════════
  console.log('');
  console.log('─'.repeat(70));
  console.log('  PHASE 4: ATOMIC MOVE (~1 second mismatch window)');
  console.log('─'.repeat(70));
  console.log('');

  if (executionSuccess) {
    const moveResult = atomicMove(sshHost, stagingPath, productionPath, dryRun);

    if (moveResult.success) {
      verifyProduction(sshHost, productionPath);

      console.log('');
      console.log('═'.repeat(70));
      console.log('  ✅ OFAC UPDATE COMPLETE');
      console.log('═'.repeat(70));
      console.log('');
      log(`On-chain update: ✅ Complete`);
      log(`Tree deployment: ✅ Complete`);
      log(`Mismatch window: ${moveResult.durationMs}ms (~${(moveResult.durationMs / 1000).toFixed(1)}s)`);
      console.log('');

      if (moveResult.durationMs < 2000) {
        console.log('  🎉 Minimal mismatch achieved!');
      }
      console.log('');
    } else {
      console.error('');
      console.error('⚠️  CRITICAL: On-chain update succeeded but move failed!');
      console.error('    Manual move required IMMEDIATELY:');
      console.error(`    ssh ${sshHost} "mv ${stagingPath}/*.json ${productionPath}/"`);
      process.exit(1);
    }
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
