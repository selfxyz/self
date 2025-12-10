/**
 * Test Safe Proposal Script
 *
 * Tests the full Safe proposal flow using a test Safe.
 * This script will propose a dummy transaction to verify the mechanics work.
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx tsx contracts/scripts/ofac/testSafeProposal.ts
 *
 * Requirements:
 *   - PRIVATE_KEY must be one of the Safe owners
 *   - SEPOLIA_RPC_URL in .env
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test Safe on Sepolia (2/2 multisig)
const TEST_SAFE_ADDRESS = '0x4264a631c5E685a622b5C8171b5f17BeD7FB30c6';
const SEPOLIA_CHAIN_ID = 11155111;

async function main() {
  console.log('='.repeat(60));
  console.log('Safe Proposal Test');
  console.log('='.repeat(60));
  console.log(`Safe: ${TEST_SAFE_ADDRESS}`);
  console.log(`Network: Sepolia (${SEPOLIA_CHAIN_ID})`);
  console.log('');

  // Check for private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log('❌ PRIVATE_KEY environment variable not set');
    console.log('');
    console.log('To test, run with your private key:');
    console.log('  PRIVATE_KEY=0x... npx tsx contracts/scripts/ofac/testSafeProposal.ts');
    console.log('');
    console.log('The private key must be one of the Safe owners:');
    console.log('  - 0x846F1cF04ec494303e4B90440b130bb01913E703');
    console.log('  - 0xD886Cd4c6A33c0C56c4fe0d7b597c69b98E28625');
    process.exit(1);
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
  console.log(`Using RPC: ${rpcUrl.includes('alchemy') ? 'Alchemy' : 'Public'}`);
  console.log('');

  try {
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = await signer.getAddress();

    console.log(`Signer address: ${signerAddress}`);

    // Check if signer is owner
    const safeOwners = [
      '0x846F1cF04ec494303e4B90440b130bb01913E703'.toLowerCase(),
      '0xD886Cd4c6A33c0C56c4fe0d7b597c69b98E28625'.toLowerCase(),
    ];

    if (!safeOwners.includes(signerAddress.toLowerCase())) {
      console.log('❌ Signer is not a Safe owner');
      console.log('   Your address:', signerAddress);
      console.log('   Required owners:', safeOwners);
      process.exit(1);
    }

    console.log('✅ Signer is a Safe owner');
    console.log('');

    // Import Safe SDK dynamically
    console.log('Loading Safe SDK...');
    const SafeApiKit = (await import('@safe-global/api-kit')).default;
    const Safe = (await import('@safe-global/protocol-kit')).default;

    // Initialize Safe SDK with explicit txServiceUrl (no API key needed for public endpoints)
    const apiKit = new SafeApiKit({
      chainId: BigInt(SEPOLIA_CHAIN_ID),
      txServiceUrl: 'https://safe-transaction-sepolia.safe.global/api',
    });

    // Initialize Protocol Kit
    const protocolKit = await Safe.init({
      provider: rpcUrl,
      signer: privateKey,
      safeAddress: TEST_SAFE_ADDRESS,
    });

    console.log('✅ Safe SDK initialized');
    console.log('');

    // Create a dummy transaction (send 0 ETH to self)
    const safeTransactionData = {
      to: TEST_SAFE_ADDRESS,
      value: '0',
      data: '0x',
    };

    console.log('Creating test transaction...');
    console.log(`  To: ${safeTransactionData.to}`);
    console.log(`  Value: ${safeTransactionData.value}`);
    console.log(`  Data: ${safeTransactionData.data}`);
    console.log('');

    // Create Safe transaction
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [safeTransactionData],
    });

    // Get transaction hash
    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
    console.log(`Safe TX Hash: ${safeTxHash}`);

    // Sign the transaction
    console.log('Signing transaction...');
    const signature = await protocolKit.signHash(safeTxHash);

    // Propose to Safe Transaction Service
    console.log('Proposing to Safe Transaction Service...');
    await apiKit.proposeTransaction({
      safeAddress: TEST_SAFE_ADDRESS,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress: signerAddress,
      senderSignature: signature.data,
    });

    console.log('');
    console.log('✅ Transaction proposed successfully!');
    console.log('');
    console.log('='.repeat(60));
    console.log('NEXT STEPS:');
    console.log('='.repeat(60));
    console.log('1. Go to Safe UI to see the pending transaction:');
    console.log(`   https://app.safe.global/transactions/queue?safe=sep:${TEST_SAFE_ADDRESS}`);
    console.log('');
    console.log('2. Get the 2nd signature from the other owner');
    console.log('');
    console.log('3. Execute the transaction');
    console.log('');
    console.log('4. The watcher would detect the execution (if watching this Safe)');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
