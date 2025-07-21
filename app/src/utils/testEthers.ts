// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { ethers } from './ethers';

export function testEthersPolyfill() {
  try {
    // Test 1: Basic ethers functionality
    console.log('🧪 Testing ethers polyfill...');

    // Test 2: Mnemonic validation
    const validMnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const isValid = ethers.Mnemonic.isValidMnemonic(validMnemonic);
    console.log('✅ Mnemonic validation:', isValid);

    // Test 3: Wallet creation from mnemonic
    const wallet = ethers.Wallet.fromPhrase(validMnemonic);
    console.log('✅ Wallet creation:', wallet.address);

    // Test 4: Random bytes generation (tests crypto polyfill)
    const randomBytes = ethers.randomBytes(32);
    console.log('✅ Random bytes generation:', randomBytes.length, 'bytes');

    // Test 5: Keccak256 hashing
    const hash = ethers.keccak256('0x1234');
    console.log('✅ Keccak256 hashing:', hash);

    console.log('🎉 All ethers polyfill tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Ethers polyfill test failed:', error);
    return false;
  }
}
