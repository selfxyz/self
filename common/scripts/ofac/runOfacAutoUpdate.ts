/**
 * OFAC Auto Updater (Single-Shot)
 *
 * Pipeline + on-chain update + GCS upload in one run:
 * 1. Download + parse OFAC SDN list
 * 2. Build all OFAC Merkle trees
 * 3. Upload trees to versioned GCS path
 * 4. Update on-chain OFAC roots (direct signer, no multisig)
 * 5. Atomically update GCS pointer file
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { runOfacPipeline } from './index.js';
import { uploadToGcs, updatePointerFile, verifyGcsFiles } from './gcsUpload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default RPC URLs (public endpoints)
const DEFAULT_RPC_URLS: Record<string, string> = {
  celo: 'https://forno.celo.org',
  'celo-sepolia': 'https://celo-sepolia.drpc.org',
};

const DEFAULT_GCS_BUCKETS: Record<string, string> = {
  celo: 'self-ofac-prod',
  'celo-sepolia': 'self-ofac-staging',
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
  rootTypes: Array<'passportNo' | 'nameAndDob' | 'nameAndYob'>;
  rootTreePrefix: string;
}

const REGISTRY_CONFIGS: RegistryConfig[] = [
  {
    name: 'Passport Registry',
    registryKey: 'IdentityRegistry',
    rootTypes: ['passportNo', 'nameAndDob', 'nameAndYob'],
    rootTreePrefix: '',
  },
  {
    name: 'ID Card Registry',
    registryKey: 'IdentityRegistryIdCard',
    rootTypes: ['nameAndDob', 'nameAndYob'],
    rootTreePrefix: '_id_card',
  },
  {
    name: 'Aadhaar Registry',
    registryKey: 'IdentityRegistryAadhaar',
    rootTypes: ['nameAndDob', 'nameAndYob'],
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

  async function updateRoot(
    rootType: 'passportNo' | 'nameAndDob' | 'nameAndYob',
    updateFn: keyof ethers.Contract
  ) {
    const newRoot = getRootForRegistry(roots, config, rootType);
    if (!newRoot) return;

    const oldRoot = await getCurrentRoot(contract, rootType);
    if (oldRoot === newRoot) {
      log(`Skipping ${config.name} ${rootType}: on-chain root already matches`);
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

  for (const rootType of config.rootTypes) {
    if (rootType === 'passportNo') {
      await updateRoot('passportNo', 'updatePassportNoOfacRoot');
    } else if (rootType === 'nameAndDob') {
      await updateRoot('nameAndDob', 'updateNameAndDobOfacRoot');
    } else {
      await updateRoot('nameAndYob', 'updateNameAndYobOfacRoot');
    }
  }

  return updates;
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
  const bucketName =
    process.env.GCS_BUCKET_NAME || DEFAULT_GCS_BUCKETS[network] || DEFAULT_GCS_BUCKETS.celo;
  const basePath = process.env.GCS_BASE_PATH || 'ofac';
  const skipUpload = process.env.SKIP_UPLOAD === 'true';

  const timestamp = Date.now();

  log(`Network: ${network}`);
  log(`RPC: ${rpcUrl}`);
  log(`Data dir: ${dataDir}`);
  log(`Trees dir: ${treesDir}`);
  log(`GCS bucket: ${bucketName}`);
  log(`GCS base path: ${basePath}`);
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

  // Step 4: On-chain updates
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
  if (totalUpdates === 0) {
    log('No on-chain updates needed; skipping tree deployment.');
    return;
  }

  // Step 5: Upload to GCS (versioned path)
  console.log('');
  console.log('-'.repeat(70));
  console.log('  PHASE: UPLOAD TO GCS');
  console.log('-'.repeat(70));
  console.log('');

  if (skipUpload) {
    log('Skipping upload (SKIP_UPLOAD=true)');
    return;
  }

  const uploadResult = await uploadToGcs({
    bucketName,
    basePath,
    treesDir,
    roots,
    timestamp,
    dryRun,
  });

  if (!uploadResult.success) {
    console.error('ERROR: GCS upload failed:', uploadResult.error);
    console.error('On-chain updates succeeded but file upload failed.');
    process.exit(1);
  }

  log(`Uploaded ${uploadResult.filesUploaded} files to ${uploadResult.versionPath}`);

  // Step 6: Update pointer file (atomic switch)
  console.log('');
  console.log('-'.repeat(70));
  console.log('  PHASE: ATOMIC POINTER UPDATE');
  console.log('-'.repeat(70));
  console.log('');

  const pointerResult = await updatePointerFile(
    bucketName,
    basePath,
    uploadResult.versionPath!,
    roots,
    dryRun
  );

  if (pointerResult.success) {
    await verifyGcsFiles(bucketName, uploadResult.versionPath!, dryRun);
    log(
      `Mismatch window: ${pointerResult.durationMs}ms (~${(pointerResult.durationMs / 1000).toFixed(1)}s)`
    );
  } else {
    console.error('WARNING: On-chain updates succeeded but pointer update failed.');
    console.error(`Error: ${pointerResult.error}`);
    console.error(`Files are at: gs://${bucketName}/${uploadResult.versionPath}`);
    console.error('Manual pointer update may be required.');
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
