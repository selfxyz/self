/**
 * OFAC Auto Updater (Single-Shot)
 *
 * Pipeline + on-chain update + prestaged upload in one run:
 * 1. Download + parse OFAC SDN list
 * 2. Build all OFAC Merkle trees
 * 3. Pre-stage trees to server
 * 4. Update on-chain OFAC roots (direct signer, no multisig)
 * 5. Atomically move trees into production
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

import { runOfacPipeline } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default RPC URLs (public endpoints)
const DEFAULT_RPC_URLS: Record<string, string> = {
  celo: 'https://forno.celo.org',
  'celo-sepolia': 'https://celo-sepolia.drpc.org',
  sepolia: 'https://rpc.sepolia.org',
};

const DEFAULT_UPLOAD_PATHS: Record<string, string> = {
  celo: '/home/ec2-user/self-infra/merkle-tree-reader/common/constants/ofac',
  'celo-sepolia': '/home/ec2-user/self-infra-staging/merkle-tree-reader/common/constants/ofac',
  sepolia: '/home/ec2-user/ofac-e2e-test',
};

// Hardcoded registry addresses (Celo Mainnet)
const CELO_REGISTRY_ADDRESSES: Record<string, string> = {
  IdentityRegistry: '0x37F5CB8cB1f6B00aa768D8aA99F1A9289802A968',
  IdentityRegistryIdCard: '0xeAD1E6Ec29c1f3D33a0662f253a3a94D189566E1',
  IdentityRegistryAadhaar: '0xd603Fa8C8f4694E8DD1DcE1f27C0C3fc91e32Ac4',
};

// Registry configuration
interface RegistryConfig {
  name: string;
  registryKey: string;
  hasPassportNo: boolean;
  hasNameAndDob: boolean;
  hasNameAndYob: boolean;
  rootTreePrefix: string;
}

const REGISTRY_CONFIGS: RegistryConfig[] = [
  {
    name: 'Passport Registry',
    registryKey: 'IdentityRegistry',
    hasPassportNo: true,
    hasNameAndDob: true,
    hasNameAndYob: true,
    rootTreePrefix: '',
  },
  {
    name: 'ID Card Registry',
    registryKey: 'IdentityRegistryIdCard',
    hasPassportNo: false,
    hasNameAndDob: true,
    hasNameAndYob: true,
    rootTreePrefix: '_id_card',
  },
  {
    name: 'Aadhaar Registry',
    registryKey: 'IdentityRegistryAadhaar',
    hasPassportNo: false,
    hasNameAndDob: true,
    hasNameAndYob: true,
    rootTreePrefix: '_aadhaar',
  },
];

// Minimal ABI for OFAC root functions
const REGISTRY_ABI = [
  'function getPassportNoOfacRoot() view returns (uint256)',
  'function getNameAndDobOfacRoot() view returns (uint256)',
  'function getNameAndYobOfacRoot() view returns (uint256)',
  'function updatePassportNoOfacRoot(uint256 root)',
  'function updateNameAndDobOfacRoot(uint256 root)',
  'function updateNameAndYobOfacRoot(uint256 root)',
];

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
  'latest-roots.json',
];

function log(msg: string) {
  const timestamp = new Date().toISOString().slice(11, 23);
  console.log(`[${timestamp}] ${msg}`);
}

function getRpcUrl(network: string): string | undefined {
  switch (network) {
    case 'celo':
      return process.env.CELO_RPC_URL || DEFAULT_RPC_URLS.celo;
    case 'celo-sepolia':
      return process.env.CELO_SEPOLIA_RPC_URL || DEFAULT_RPC_URLS['celo-sepolia'];
    case 'sepolia':
      return process.env.SEPOLIA_RPC_URL || DEFAULT_RPC_URLS.sepolia;
    default:
      return process.env.RPC_URL;
  }
}

function getRegistryAddress(registryKey: string, network: string): string | null {
  if (network === 'celo') {
    return CELO_REGISTRY_ADDRESSES[registryKey] || null;
  }
  return null;
}

function loadRoots(rootsPath: string): Record<string, string> {
  if (!fs.existsSync(rootsPath)) {
    throw new Error('Roots file not found: ' + rootsPath);
  }
  const data = JSON.parse(fs.readFileSync(rootsPath, 'utf-8'));
  return data.roots || data;
}

function getRootForRegistry(
  roots: Record<string, string>,
  config: RegistryConfig,
  rootType: 'passportNo' | 'nameAndDob' | 'nameAndYob'
): string | null {
  let key: string;
  switch (rootType) {
    case 'passportNo':
      key = 'passport_no_and_nationality';
      break;
    case 'nameAndDob':
      if (config.rootTreePrefix === '_aadhaar') key = 'aadhaar_name_and_dob';
      else if (config.rootTreePrefix === '_kyc') key = 'kyc_name_and_dob';
      else if (config.rootTreePrefix === '_id_card') key = 'name_and_dob_id_card';
      else key = 'name_and_dob';
      break;
    case 'nameAndYob':
      if (config.rootTreePrefix === '_aadhaar') key = 'aadhaar_name_and_yob';
      else if (config.rootTreePrefix === '_kyc') key = 'kyc_name_and_yob';
      else if (config.rootTreePrefix === '_id_card') key = 'name_and_yob_id_card';
      else key = 'name_and_yob';
      break;
  }
  return roots[key] || null;
}

async function getCurrentRoot(
  contract: ethers.Contract,
  rootType: 'passportNo' | 'nameAndDob' | 'nameAndYob'
): Promise<string> {
  try {
    switch (rootType) {
      case 'passportNo':
        return (await contract.getPassportNoOfacRoot()).toString();
      case 'nameAndDob':
        return (await contract.getNameAndDobOfacRoot()).toString();
      case 'nameAndYob':
        return (await contract.getNameAndYobOfacRoot()).toString();
    }
  } catch {
    return '0';
  }
}

async function updateRegistryRoots(
  config: RegistryConfig,
  registryAddress: string,
  signer: ethers.Wallet,
  roots: Record<string, string>,
  dryRun: boolean
): Promise<number> {
  const contract = new ethers.Contract(registryAddress, REGISTRY_ABI, signer);
  let updates = 0;

  async function maybeUpdate(
    rootType: 'passportNo' | 'nameAndDob' | 'nameAndYob',
    updateFn: keyof ethers.Contract
  ) {
    const newRoot = getRootForRegistry(roots, config, rootType);
    if (!newRoot) return;

    const oldRoot = await getCurrentRoot(contract, rootType);
    if (oldRoot === newRoot) {
      log(`No change for ${config.name} ${rootType}`);
      return;
    }

    log(`Updating ${config.name} ${rootType}`);
    if (dryRun) {
      log('[DRY RUN] Skipping on-chain update');
      updates += 1;
      return;
    }

    const tx = await (contract[updateFn] as any)(newRoot);
    log(`TX submitted: ${tx.hash}`);
    const receipt = await tx.wait(1);
    if (receipt?.status !== 1) {
      throw new Error(`Update failed for ${config.name} ${rootType}`);
    }
    log(`Confirmed in block ${receipt.blockNumber}`);
    updates += 1;
  }

  if (config.hasPassportNo) {
    await maybeUpdate('passportNo', 'updatePassportNoOfacRoot');
  }
  if (config.hasNameAndDob) {
    await maybeUpdate('nameAndDob', 'updateNameAndDobOfacRoot');
  }
  if (config.hasNameAndYob) {
    await maybeUpdate('nameAndYob', 'updateNameAndYobOfacRoot');
  }

  return updates;
}

function prestageFiles(
  treesDir: string,
  sshHost: string,
  stagingPath: string,
  dryRun: boolean
): boolean {
  log(`PRE-STAGING: Uploading trees to ${sshHost}:${stagingPath}`);

  const filesToUpload = TREE_FILES
    .map((f) => path.join(treesDir, f))
    .filter((f) => fs.existsSync(f));

  if (filesToUpload.length === 0) {
    log('ERROR: No tree files found to upload!');
    return false;
  }

  log(`   Found ${filesToUpload.length} files`);

  if (dryRun) {
    log('   [DRY RUN] Would upload:');
    filesToUpload.forEach((f) => log(`     - ${path.basename(f)}`));
    return true;
  }

  try {
    execSync(`ssh ${sshHost} "mkdir -p ${stagingPath}"`, { stdio: 'pipe' });

    for (const file of filesToUpload) {
      const basename = path.basename(file);
      process.stdout.write(`   Uploading ${basename}...`);
      execSync(`scp "${file}" "${sshHost}:${stagingPath}/"`, { stdio: 'pipe' });
      console.log(' ok');
    }

    log(`Pre-staged ${filesToUpload.length} files`);
    return true;
  } catch (error) {
    log(`ERROR: Pre-staging failed: ${error}`);
    return false;
  }
}

function atomicMove(
  sshHost: string,
  stagingPath: string,
  productionPath: string,
  dryRun: boolean
): { success: boolean; durationMs: number } {
  log(`ATOMIC MOVE: ${stagingPath} -> ${productionPath}`);

  if (dryRun) {
    log('   [DRY RUN] Would move files');
    return { success: true, durationMs: 0 };
  }

  const startTime = Date.now();

  try {
    execSync(`ssh ${sshHost} "mkdir -p ${productionPath}"`, { stdio: 'pipe' });

    const moveCmd = `ssh ${sshHost} "mv ${stagingPath}/*.json ${productionPath}/ && rm -rf ${stagingPath}"`;
    execSync(moveCmd, { stdio: 'pipe' });

    const durationMs = Date.now() - startTime;
    log(`Atomic move completed in ${durationMs}ms`);

    return { success: true, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log(`ERROR: Atomic move failed after ${durationMs}ms: ${error}`);
    return { success: false, durationMs };
  }
}

function verifyProduction(sshHost: string, productionPath: string): void {
  log('Verifying production files...');
  try {
    const result = execSync(
      `ssh ${sshHost} "ls -la ${productionPath}/*.json 2>/dev/null | tail -10"`,
      { encoding: 'utf-8' }
    );
    console.log(result);
  } catch {
    log('Could not verify (may still be successful)');
  }
}

async function main() {
  console.log('');
  console.log('='.repeat(70));
  console.log('  OFAC AUTO UPDATE (PIPELINE + ON-CHAIN + UPLOAD)');
  console.log('='.repeat(70));
  console.log('');

  const network = process.env.NETWORK || 'celo';
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL || getRpcUrl(network);
  const dryRun = process.env.DRY_RUN === 'true';

  if (!privateKey) {
    console.error('ERROR: PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  if (!rpcUrl) {
    console.error('ERROR: RPC URL required (set RPC_URL or network-specific env var)');
    process.exit(1);
  }

  const dataDir = process.env.OFAC_DATA_DIR || '/data/ofac';
  const rawDir = path.join(dataDir, 'raw');
  const inputDir = path.join(dataDir, 'inputs');
  const outputDir = path.join(dataDir, 'outputs');
  const rootsPath = process.env.ROOTS_PATH || path.join(outputDir, 'latest-roots.json');

  const treesDir = process.env.TREES_DIR || outputDir;
  const sshHost = process.env.SSH_HOST || 'self-infra-staging';
  const productionPath =
    process.env.UPLOAD_PATH || DEFAULT_UPLOAD_PATHS[network] || DEFAULT_UPLOAD_PATHS.celo;
  const skipPrestage = process.env.SKIP_PRESTAGE === 'true';

  const timestamp = Date.now();
  const stagingPath = process.env.STAGING_PATH || `/tmp/ofac-prestage-${timestamp}`;

  log(`Network: ${network}`);
  log(`RPC: ${rpcUrl}`);
  log(`Data dir: ${dataDir}`);
  log(`Trees dir: ${treesDir}`);
  log(`SSH host: ${sshHost}`);
  log(`Staging: ${stagingPath}`);
  log(`Production: ${productionPath}`);
  log(`Dry Run: ${dryRun}`);
  console.log('');

  // Step 1-3: Pipeline
  log('Running OFAC pipeline...');
  const pipeline = await runOfacPipeline({
    rawDir,
    inputDir,
    outputDir,
  });

  if (!pipeline.success) {
    console.error('ERROR: Pipeline failed:', pipeline.error);
    process.exit(1);
  }

  // Step 4: Pre-stage files
  console.log('');
  console.log('-'.repeat(70));
  console.log('  PHASE: PRE-STAGE FILES');
  console.log('-'.repeat(70));
  console.log('');

  if (!skipPrestage) {
    const prestageSuccess = prestageFiles(treesDir, sshHost, stagingPath, dryRun);
    if (!prestageSuccess && !dryRun) {
      console.error('ERROR: Pre-staging failed. Aborting before on-chain update.');
      process.exit(1);
    }
  } else {
    log('Skipping pre-stage (SKIP_PRESTAGE=true)');
  }

  // Step 5: On-chain updates
  console.log('');
  console.log('-'.repeat(70));
  console.log('  PHASE: ON-CHAIN UPDATES');
  console.log('-'.repeat(70));
  console.log('');

  const roots = fs.existsSync(rootsPath)
    ? loadRoots(rootsPath)
    : loadRoots(path.join(outputDir, 'roots.json'));

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  log(`Signer: ${signer.address}`);

  let totalUpdates = 0;
  for (const config of REGISTRY_CONFIGS) {
    const address = getRegistryAddress(config.registryKey, network);
    if (!address) {
      log(`Registry not configured for network: ${config.name}`);
      continue;
    }

    log(`Updating ${config.name} at ${address}`);
    totalUpdates += await updateRegistryRoots(config, address, signer, roots, dryRun);
  }

  log(`Total updates submitted: ${totalUpdates}`);

  // Step 6: Atomic move to production
  console.log('');
  console.log('-'.repeat(70));
  console.log('  PHASE: ATOMIC MOVE');
  console.log('-'.repeat(70));
  console.log('');

  const moveResult = atomicMove(sshHost, stagingPath, productionPath, dryRun);
  if (moveResult.success) {
    verifyProduction(sshHost, productionPath);
    log(`Mismatch window: ${moveResult.durationMs}ms (~${(moveResult.durationMs / 1000).toFixed(1)}s)`);
  } else {
    console.error('WARNING: On-chain updates succeeded but move failed. Manual move required.');
    console.error(`    ssh ${sshHost} "mv ${stagingPath}/*.json ${productionPath}/"`);
    process.exit(1);
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('  OFAC AUTO UPDATE COMPLETE');
  console.log('='.repeat(70));
}

main().catch((error) => {
  console.error('ERROR: Fatal error:', error);
  process.exit(1);
});
