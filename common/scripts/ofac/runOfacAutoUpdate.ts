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
  celo: 'self-ofac-test',
  'celo-sepolia': 'self-ofac-staging',
};

// Hardcoded registry addresses
const REGISTRY_ADDRESSES: Record<string, Record<string, string>> = {
  celo: {
    IdentityRegistry: '0x37F5CB8cB1f6B00aa768D8aA99F1A9289802A968',
    IdentityRegistryIdCard: '0xeAD1E6Ec29c1f3D33a0662f253a3a94D189566E1',
    IdentityRegistryAadhaar: '0xd603Fa8C8f4694E8DD1DcE1f27C0C3fc91e32Ac4',
  },
  'celo-sepolia': {
    // Use same addresses for dry-run testing (or configure testnet addresses)
    IdentityRegistry: '0x37F5CB8cB1f6B00aa768D8aA99F1A9289802A968',
    IdentityRegistryIdCard: '0xeAD1E6Ec29c1f3D33a0662f253a3a94D189566E1',
    IdentityRegistryAadhaar: '0xd603Fa8C8f4694E8DD1DcE1f27C0C3fc91e32Ac4',
  },
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
  'function getRoleMember(bytes32 role, uint256 index) view returns (address)',
  'function getRoleMemberCount(bytes32 role) view returns (uint256)',
];

const OWNER_ABI = [
  'function owner() view returns (address)',
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
  const addresses = REGISTRY_ADDRESSES[network];
  if (!addresses) {
    return null;
  }
  return addresses[registryKey] || null;
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

async function verifyRegistryRoots(
  config: RegistryConfig,
  registryAddress: string,
  contract: ethers.Contract,
  roots: Record<string, string>
): Promise<boolean> {
  let allMatch = true;
  for (const rootType of config.rootTypes) {
    const expectedRoot = getRootForRegistry(roots, config, rootType);
    if (!expectedRoot) continue;

    const onChainRoot = await getCurrentRoot(contract, rootType);
    const matches = onChainRoot === expectedRoot;
    if (matches) {
      log(`✅ ${config.name} ${rootType}: matches (${onChainRoot.slice(0, 10)}...)`);
    } else {
      log(`❌ ${config.name} ${rootType}: mismatch`);
      log(`   Expected: ${expectedRoot}`);
      log(`   On-chain: ${onChainRoot}`);
      allMatch = false;
    }
  }
  return allMatch;
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
  const skipPipeline = process.env.SKIP_PIPELINE === 'true' || process.argv.includes('--skip-pipeline');

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
  log(`Skip Pipeline: ${skipPipeline}`);
  console.log('');

  if (!skipPipeline) {
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
  } else {
    log('Skipping pipeline (using existing trees)...');
    if (!fs.existsSync(rootsPath) && !fs.existsSync(path.join(outputDir, 'roots.json'))) {
      console.error(`ERROR: Roots file not found. Expected: ${rootsPath} or ${path.join(outputDir, 'roots.json')}`);
      process.exit(1);
    }
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

  const jsonRpcProvider = provider as ethers.JsonRpcProvider;
  const rpcUrlStr = (jsonRpcProvider as any).connection?.url || (jsonRpcProvider as any)._getConnection?.()?.url || '';
  const isFork = rpcUrlStr.includes('localhost') || rpcUrlStr.includes('127.0.0.1') || rpcUrlStr.includes('8545');

  let adminAddress: string | null = null;
  let adminSigner: ethers.Signer | null = null;

  if (isFork && !dryRun) {
    if (network === 'celo') {
      adminAddress = '0x067b18e09A10Fa03d027c1D60A098CEbbE5637f0';
      log(`[FORK] Using Celo operations multisig (OPERATIONS_ROLE): ${adminAddress}`);
    } else if (network === 'celo-sepolia') {
      const firstRegistry = REGISTRY_CONFIGS.find(c => getRegistryAddress(c.registryKey, network));
      if (firstRegistry) {
        const address = getRegistryAddress(firstRegistry.registryKey, network);
        if (address) {
          const registryOwner = new ethers.Contract(address, OWNER_ABI, jsonRpcProvider);
          adminAddress = await registryOwner.owner();
          log(`[FORK] Using Celo Sepolia owner: ${adminAddress}`);
        }
      }
    }

    if (adminAddress) {
      if (rpcUrlStr.includes('anvil') || rpcUrlStr.includes('8545')) {
        await jsonRpcProvider.send('anvil_impersonateAccount', [adminAddress]);
      } else if (rpcUrlStr.includes('hardhat') || rpcUrlStr.includes('1337')) {
        await jsonRpcProvider.send('hardhat_impersonateAccount', [adminAddress]);
      }

      adminSigner = await jsonRpcProvider.getSigner(adminAddress);

      const balance = await jsonRpcProvider.getBalance(adminAddress);
      if (balance === 0n) {
        const funder = await jsonRpcProvider.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
        await funder.sendTransaction({
          to: adminAddress,
          value: ethers.parseEther('1'),
        });
      }
      log(`[FORK] Impersonating ${adminAddress} to call update functions`);
    }
  }

  const allUpdates: Array<{
    config: RegistryConfig;
    address: string;
    rootType: 'passportNo' | 'nameAndDob' | 'nameAndYob';
    updateFn: keyof ethers.Contract;
    newRoot: string;
  }> = [];

  for (const config of REGISTRY_CONFIGS) {
    const address = getRegistryAddress(config.registryKey, network);
    if (!address) {
      if (dryRun) {
        log(`[DRY RUN] Registry not configured for ${network}: ${config.name} (skipping)`);
      } else {
        log(`Registry not configured for network: ${config.name}`);
      }
      continue;
    }

    const contract = adminSigner
      ? new ethers.Contract(address, REGISTRY_ABI, adminSigner)
      : new ethers.Contract(address, REGISTRY_ABI, signer);

    for (const rootType of config.rootTypes) {
      const newRoot = getRootForRegistry(roots, config, rootType);
      if (!newRoot) continue;

      const oldRoot = await getCurrentRoot(contract, rootType);
      if (oldRoot === newRoot) {
        log(`Skipping ${config.name} ${rootType}: on-chain root already matches`);
        continue;
      }

      let updateFn: keyof ethers.Contract;
      if (rootType === 'passportNo') {
        updateFn = 'updatePassportNoOfacRoot';
      } else if (rootType === 'nameAndDob') {
        updateFn = 'updateNameAndDobOfacRoot';
      } else {
        updateFn = 'updateNameAndYobOfacRoot';
      }

      allUpdates.push({ config, address, rootType, updateFn, newRoot });
    }
  }

  // Step 4: Upload to GCS FIRST (before on-chain updates)
  // This reduces mismatch window by doing slow uploads before fast on-chain updates
  console.log('');
  console.log('-'.repeat(70));
  console.log('  PHASE: UPLOAD TO GCS');
  console.log('-'.repeat(70));
  console.log('');

  let uploadResult;
  if (skipUpload) {
    log('Skipping upload (SKIP_UPLOAD=true)');
    if (allUpdates.length === 0 && !dryRun) {
      log('No on-chain updates needed; skipping.');
      return;
    }
  } else {
    uploadResult = await uploadToGcs({
      bucketName,
      basePath,
      treesDir,
      roots,
      timestamp,
      dryRun,
    });

    if (!uploadResult.success) {
      console.error('ERROR: GCS upload failed:', uploadResult.error);
      console.error('Cannot proceed with on-chain updates if files are not uploaded.');
      process.exit(1);
    }

    log(`Uploaded ${uploadResult.filesUploaded} files to ${uploadResult.versionPath}`);
  }

  // Step 5: On-chain updates (after files are uploaded)
  console.log('');
  console.log('-'.repeat(70));
  console.log('  PHASE: ON-CHAIN UPDATES');
  console.log('-'.repeat(70));
  console.log('');

  let totalUpdates = 0;
  let onChainConfirmedTime: number | null = null;

  if (allUpdates.length === 0) {
    log('No on-chain updates needed (all roots already match).');
  } else if (dryRun) {
    log(`[DRY RUN] Would update ${allUpdates.length} roots across ${new Set(allUpdates.map(u => u.config.name)).size} registries`);
    totalUpdates = allUpdates.length;
  } else {
    log(`Batching ${allUpdates.length} updates across ${new Set(allUpdates.map(u => u.config.name)).size} registries into one block...`);

    const contracts = new Map<string, ethers.Contract>();
    for (const { address } of allUpdates) {
      if (!contracts.has(address)) {
        contracts.set(address, adminSigner
          ? new ethers.Contract(address, REGISTRY_ABI, adminSigner)
          : new ethers.Contract(address, REGISTRY_ABI, signer));
      }
    }

    const txs = allUpdates.map(({ address, updateFn, newRoot, config, rootType }) => {
      const contract = contracts.get(address)!;
      log(`Preparing ${config.name} ${String(updateFn)}`);
      return (contract[updateFn] as any)(newRoot);
    });

    const txPromises = await Promise.all(txs);
    log(`Submitted ${txPromises.length} transactions`);

    const receipts = await Promise.all(txPromises.map(tx => tx.wait(1)));

    const blockNumbers = new Set(receipts.map(r => r.blockNumber));
    onChainConfirmedTime = Date.now();

    if (blockNumbers.size === 1) {
      log(`✅ All ${receipts.length} transactions confirmed in block ${Array.from(blockNumbers)[0]}`);
    } else {
      log(`⚠️  Transactions confirmed in ${blockNumbers.size} different blocks: ${Array.from(blockNumbers).join(', ')}`);
    }

    for (let i = 0; i < receipts.length; i++) {
      const receipt = receipts[i];
      const { config, rootType } = allUpdates[i];
      if (receipt?.status !== 1) {
        throw new Error(`Update failed for ${config.name} ${rootType}`);
      }
      log(`✅ ${config.name} ${rootType} updated in block ${receipt.blockNumber}`);
    }

    totalUpdates = receipts.length;
  }

  log(`Total updates submitted: ${totalUpdates}`);

  // Step 6: Verify on-chain updates
  if (!dryRun && totalUpdates > 0) {
    console.log('');
    console.log('-'.repeat(70));
    console.log('  PHASE: VERIFY ON-CHAIN UPDATES');
    console.log('-'.repeat(70));
    console.log('');

    for (const config of REGISTRY_CONFIGS) {
      const registryAddress = getRegistryAddress(config.registryKey, network);
      if (!registryAddress) continue;

      const contract = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);
      const verified = await verifyRegistryRoots(config, registryAddress, contract, roots);
      if (!verified) {
        throw new Error(`Verification failed for ${config.name}`);
      }
    }
    log('✅ All on-chain roots verified successfully');
  }

  // Step 7: Atomic pointer update (immediately after on-chain confirmation)
  if (!skipUpload && uploadResult) {
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

      if (onChainConfirmedTime !== null && totalUpdates > 0 && pointerResult.completedAt) {
        const mismatchWindowMs = pointerResult.completedAt - onChainConfirmedTime;
        log(
          `Mismatch window: ${mismatchWindowMs}ms (~${(mismatchWindowMs / 1000).toFixed(1)}s)`
        );
      } else {
        log(
          `Pointer update duration: ${pointerResult.durationMs}ms (~${(pointerResult.durationMs / 1000).toFixed(1)}s)`
        );
      }
    } else {
      console.error('WARNING: On-chain updates succeeded but pointer update failed.');
      console.error(`Error: ${pointerResult.error}`);
      console.error(`Files are at: gs://${bucketName}/${uploadResult.versionPath}`);
      console.error('Manual pointer update may be required.');
      process.exit(1);
    }
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
