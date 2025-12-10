/**
 * OFAC Multisig Update Preparation
 *
 * Prepares Safe multisig transactions for updating OFAC roots across all registries.
 *
 * Features:
 * - Reads new roots from the OFAC pipeline output
 * - Compares with current on-chain roots
 * - Generates batched transaction data for Safe
 * - Uses registry.json for deployed addresses
 *
 * Usage:
 *   NETWORK=celo npx tsx contracts/scripts/ofac/prepareMultisigUpdate.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2/5 Operations Multisig on Celo Mainnet
const CELO_MAINNET_SAFE = '0x067b18e09A10Fa03d027c1D60A098CEbbE5637f0';

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

// Transaction data structure for Safe
interface SafeTransaction {
  to: string;
  value: string;
  data: string;
  operation: number;
}

interface UpdateResult {
  registry: string;
  address: string;
  updates: {
    function: string;
    oldRoot: string;
    newRoot: string;
    changed: boolean;
  }[];
  transactions: SafeTransaction[];
}

interface PrepareResult {
  success: boolean;
  network: string;
  timestamp: string;
  registryUpdates: UpdateResult[];
  batchedTransactions: SafeTransaction[];
  totalChanges: number;
  error?: string;
}

/**
 * Get registry address for a network
 */
function getRegistryAddress(registryKey: string, network: string): string | null {
  if (network === 'celo') {
    return CELO_REGISTRY_ADDRESSES[registryKey] || null;
  }
  // Add other networks as needed
  return null;
}

function loadNewRoots(rootsPath: string): Record<string, string> {
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

function generateCalldata(
  contract: ethers.Contract,
  rootType: 'passportNo' | 'nameAndDob' | 'nameAndYob',
  newRoot: string
): string {
  switch (rootType) {
    case 'passportNo':
      return contract.interface.encodeFunctionData('updatePassportNoOfacRoot', [newRoot]);
    case 'nameAndDob':
      return contract.interface.encodeFunctionData('updateNameAndDobOfacRoot', [newRoot]);
    case 'nameAndYob':
      return contract.interface.encodeFunctionData('updateNameAndYobOfacRoot', [newRoot]);
  }
}

async function prepareRegistryUpdates(
  config: RegistryConfig,
  registryAddress: string,
  provider: ethers.Provider,
  newRoots: Record<string, string>
): Promise<UpdateResult> {
  const contract = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);
  const updates: UpdateResult['updates'] = [];
  const transactions: SafeTransaction[] = [];

  if (config.hasPassportNo) {
    const newRoot = getRootForRegistry(newRoots, config, 'passportNo');
    if (newRoot) {
      const oldRoot = await getCurrentRoot(contract, 'passportNo');
      const changed = oldRoot !== newRoot;
      updates.push({ function: 'updatePassportNoOfacRoot', oldRoot, newRoot, changed });
      if (changed) {
        transactions.push({
          to: registryAddress,
          value: '0',
          data: generateCalldata(contract, 'passportNo', newRoot),
          operation: 0,
        });
      }
    }
  }

  if (config.hasNameAndDob) {
    const newRoot = getRootForRegistry(newRoots, config, 'nameAndDob');
    if (newRoot) {
      const oldRoot = await getCurrentRoot(contract, 'nameAndDob');
      const changed = oldRoot !== newRoot;
      updates.push({ function: 'updateNameAndDobOfacRoot', oldRoot, newRoot, changed });
      if (changed) {
        transactions.push({
          to: registryAddress,
          value: '0',
          data: generateCalldata(contract, 'nameAndDob', newRoot),
          operation: 0,
        });
      }
    }
  }

  if (config.hasNameAndYob) {
    const newRoot = getRootForRegistry(newRoots, config, 'nameAndYob');
    if (newRoot) {
      const oldRoot = await getCurrentRoot(contract, 'nameAndYob');
      const changed = oldRoot !== newRoot;
      updates.push({ function: 'updateNameAndYobOfacRoot', oldRoot, newRoot, changed });
      if (changed) {
        transactions.push({
          to: registryAddress,
          value: '0',
          data: generateCalldata(contract, 'nameAndYob', newRoot),
          operation: 0,
        });
      }
    }
  }

  return { registry: config.name, address: registryAddress, updates, transactions };
}

// Default RPC URLs (public endpoints)
const DEFAULT_RPC_URLS: Record<string, string> = {
  'celo': 'https://forno.celo.org',
  'celo-sepolia': 'https://celo-sepolia.drpc.org',
  'sepolia': 'https://rpc.sepolia.org',
};

function getRpcUrl(network: string): string | undefined {
  switch (network) {
    case 'celo': return process.env.CELO_RPC_URL || DEFAULT_RPC_URLS['celo'];
    case 'celo-sepolia': return process.env.CELO_SEPOLIA_RPC_URL || DEFAULT_RPC_URLS['celo-sepolia'];
    case 'sepolia': return process.env.SEPOLIA_RPC_URL || DEFAULT_RPC_URLS['sepolia'];
    default: return process.env.RPC_URL;
  }
}

export async function prepareOfacMultisigUpdate(
  rootsPath: string,
  network?: string
): Promise<PrepareResult> {
  const timestamp = new Date().toISOString();
  const targetNetwork = network || process.env.NETWORK || 'celo';

  const rpcUrl = getRpcUrl(targetNetwork);
  if (!rpcUrl) {
    return {
      success: false,
      network: targetNetwork,
      timestamp,
      registryUpdates: [],
      batchedTransactions: [],
      totalChanges: 0,
      error: 'No RPC URL found for network: ' + targetNetwork,
    };
  }

  try {
    console.log('Loading new roots from: ' + rootsPath);
    const newRoots = loadNewRoots(rootsPath);
    console.log('Loaded ' + Object.keys(newRoots).length + ' root values');

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log('Connected to network: ' + targetNetwork);

    const registryUpdates: UpdateResult[] = [];
    const batchedTransactions: SafeTransaction[] = [];

    for (const config of REGISTRY_CONFIGS) {
      const address = getRegistryAddress(config.registryKey, targetNetwork);
      if (!address) {
        console.log('Registry not configured for network: ' + config.name);
        continue;
      }

      console.log('\nProcessing ' + config.name + ' at ' + address);
      const result = await prepareRegistryUpdates(config, address, provider, newRoots);
      registryUpdates.push(result);
      batchedTransactions.push(...result.transactions);
    }

    return {
      success: true,
      network: targetNetwork,
      timestamp,
      registryUpdates,
      batchedTransactions,
      totalChanges: batchedTransactions.length,
    };
  } catch (error) {
    return {
      success: false,
      network: targetNetwork,
      timestamp,
      registryUpdates: [],
      batchedTransactions: [],
      totalChanges: 0,
      error: (error as Error).message,
    };
  }
}

function generateSafeTransactionBuilderJson(result: PrepareResult, safeAddress: string): object {
  const chainIdMap: Record<string, string> = {
    celo: '42220',
    'celo-sepolia': '11142220',
    sepolia: '11155111',
  };

  return {
    version: '1.0',
    chainId: chainIdMap[result.network] || '42220',
    createdAt: Date.now(),
    meta: {
      name: 'OFAC Root Update',
      description: 'Update OFAC roots across ' + result.registryUpdates.length + ' registries',
      txBuilderVersion: '1.16.3',
      createdFromSafeAddress: safeAddress,
    },
    transactions: result.batchedTransactions.map((tx) => ({
      to: tx.to,
      value: tx.value,
      data: tx.data,
    })),
  };
}

function printSummary(result: PrepareResult): void {
  console.log('\n' + '='.repeat(70));
  console.log('OFAC MULTISIG UPDATE PREPARATION');
  console.log('='.repeat(70));
  console.log('Network: ' + result.network);
  console.log('Timestamp: ' + result.timestamp);

  if (!result.success) {
    console.log('FAILED: ' + result.error);
    return;
  }

  for (const registry of result.registryUpdates) {
    console.log('\n' + registry.registry);
    console.log('  Address: ' + registry.address);
    for (const update of registry.updates) {
      const status = update.changed ? 'CHANGED' : 'UNCHANGED';
      console.log('  ' + update.function + ': ' + status);
      if (update.changed) {
        console.log('    Old: ' + update.oldRoot.substring(0, 30) + '...');
        console.log('    New: ' + update.newRoot.substring(0, 30) + '...');
      }
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log('Total transactions: ' + result.totalChanges);
  if (result.totalChanges === 0) {
    console.log('\nNo changes needed - all roots are up to date!');
  } else {
    console.log('\nTransactions need to be submitted to Safe multisig for approval');
  }
}

async function main() {
  const rootsPath = process.argv[2] || path.join(__dirname, '../../../common/ofacdata/outputs/latest-roots.json');
  const safeAddress = process.env.OFAC_SAFE_ADDRESS || CELO_MAINNET_SAFE;

  console.log('='.repeat(60));
  console.log('OFAC Multisig Update Preparation');
  console.log('='.repeat(60));
  console.log('Roots file: ' + rootsPath);
  console.log('Safe address: ' + safeAddress);

  const result = await prepareOfacMultisigUpdate(rootsPath);
  printSummary(result);

  if (result.success && result.totalChanges > 0) {
    const txBuilderJson = generateSafeTransactionBuilderJson(result, safeAddress);
    const outputPath = path.join(__dirname, 'safe-tx-batch.json');
    fs.writeFileSync(outputPath, JSON.stringify(txBuilderJson, null, 2));
    console.log('\nSafe Transaction Builder JSON saved to: ' + outputPath);

    const detailPath = path.join(__dirname, 'update-details.json');
    fs.writeFileSync(detailPath, JSON.stringify(result, null, 2));
    console.log('Detailed update info saved to: ' + detailPath);
  }

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
