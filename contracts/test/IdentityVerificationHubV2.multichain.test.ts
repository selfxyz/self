// SPDX-License-Identifier: MIT
// Test suite for multichain verification functionality in IdentityVerificationHubImplV2

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import type { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('IdentityVerificationHubV2 - Multichain', function () {
  // Fixtures for test setup
  async function deployHubFixture() {
    const [owner, user, dAppAddress, bridgeEndpoint, destHub] = await ethers.getSigners();

    // Deploy CustomVerifier library first
    const CustomVerifier = await ethers.getContractFactory('CustomVerifier');
    const customVerifier = await CustomVerifier.deploy();
    await customVerifier.waitForDeployment();

    // Deploy Hub contract with proxy (production pattern)
    const HubImpl = await ethers.getContractFactory('IdentityVerificationHubImplV2', {
      libraries: {
        CustomVerifier: await customVerifier.getAddress(),
      },
    });
    const implementation = await HubImpl.deploy();
    await implementation.waitForDeployment();

    const initData = implementation.interface.encodeFunctionData('initialize');
    const Proxy = await ethers.getContractFactory('ERC1967Proxy');
    const proxy = await Proxy.deploy(await implementation.getAddress(), initData);
    await proxy.waitForDeployment();

    const hub = HubImpl.attach(await proxy.getAddress());

    // Configure bridge settings
    await hub.setBridgeEndpoint(bridgeEndpoint.address);
    await hub.setDestinationHub(8453, ethers.zeroPadValue(destHub.address, 32)); // Base mainnet
    await hub.setDestinationHub(84532, ethers.zeroPadValue(destHub.address, 32)); // Base Sepolia

    return { hub, owner, user, dAppAddress, bridgeEndpoint, destHub };
  }

  async function deployMockBridgeFixture() {
    const [owner] = await ethers.getSigners();

    const MockBridge = await ethers.getContractFactory('MockBridgeProvider');
    const mockBridge = await MockBridge.deploy();

    return { mockBridge, owner };
  }

  describe('verifyMultichain()', function () {
    describe('Input Validation', function () {
      it.skip('should revert if destChainId equals current chain', async function () {
        const { hub, user, dAppAddress } = await loadFixture(deployHubFixture);

        // TODO: Build multichain input with destChainId = block.chainid
        const baseInput = '0x'; // Placeholder
        const userContext = '0x'; // Placeholder

        await expect(
          hub.connect(user).verifyMultichain(baseInput, userContext)
        ).to.be.revertedWithCustomError(hub, 'SameChainBridge');
      });

      it('should revert with InputTooShort for malformed input', async function () {
        const { hub, user, dAppAddress } = await loadFixture(deployHubFixture);

        const malformedInput = '0x1234'; // Too short (< 128 bytes for multichain)
        const userContext = '0x';

        await expect(
          hub.connect(user).verifyMultichain(malformedInput, userContext)
        ).to.be.revertedWithCustomError(hub, 'InputTooShort');
      });

      it.skip('should revert if extracted chainId does not match embedded destChainId', async function () {
        const { hub, user, dAppAddress } = await loadFixture(deployHubFixture);

        // TODO: Build input where userContext destChainId != baseInput destChainId
        const baseInput = '0x'; // Placeholder
        const userContext = '0x'; // Placeholder

        await expect(
          hub.connect(user).verifyMultichain(baseInput, userContext)
        ).to.be.revertedWithCustomError(hub, 'InvalidChainId');
      });
    });

    describe('Bridge Configuration', function () {
      it.skip('should revert with BridgeEndpointNotSet if bridge endpoint not configured', async function () {
        const { hub, user, dAppAddress } = await loadFixture(deployHubFixture);

        // Clear bridge endpoint
        await hub.setBridgeEndpoint(ethers.ZeroAddress);

        // TODO: Build valid multichain input
        const baseInput = '0x'; // Placeholder
        const userContext = '0x'; // Placeholder

        await expect(
          hub.connect(user).verifyMultichain(baseInput, userContext)
        ).to.be.revertedWithCustomError(hub, 'NoBridgeEndpoint');
      });

      it.skip('should revert with DestinationHubNotSet if destination hub not set', async function () {
        const { hub, user, dAppAddress } = await loadFixture(deployHubFixture);

        // Clear destination hub for a specific chain
        await hub.setDestinationHub(8453, ethers.zeroPadValue('0x', 32));

        // TODO: Build valid multichain input with destChainId = 8453
        const baseInput = '0x'; // Placeholder
        const userContext = '0x'; // Placeholder

        await expect(
          hub.connect(user).verifyMultichain(baseInput, userContext)
        ).to.be.revertedWithCustomError(hub, 'NoDestinationHub');
      });
    });

    describe('Successful Multichain Verification', function () {
      it.skip('should verify proof and emit DisclosureProofMultichainInitiated event', async function () {
        const { hub, dAppAddress } = await loadFixture(deployHubFixture);
        const { mockBridge } = await loadFixture(deployMockBridgeFixture);

        // Set mock bridge as endpoint
        await hub.setBridgeEndpoint(mockBridge.target);

        // TODO: Build complete valid multichain input
        // Format: attestationId | scope | destChainId | destDAppAddress | proofPayload
        const destChainId = 8453; // Base mainnet
        const baseInput = '0x'; // Placeholder - needs actual proof
        const userContext = '0x'; // Placeholder - needs actual user context

        // TODO: Execute verification and check event emission
        const tx = await hub.verifyMultichain(baseInput, userContext, {
          value: ethers.parseEther('0.01'), // Bridge fee
        });

        const receipt = await tx.wait();

        // Verify event emitted
        // await expect(tx)
        //   .to.emit(hub, 'DisclosureProofMultichainInitiated')
        //   .withArgs(
        //     /* messageId */ ethers.AnyValue,
        //     /* destChainId */ destChainId,
        //     /* destDAppAddress */ dAppAddress.address,
        //     /* configId */ ethers.AnyValue,
        //     /* userIdentifier */ ethers.AnyValue,
        //     /* output */ ethers.AnyValue,
        //     /* userDataToPass */ ethers.AnyValue,
        //     /* timestamp */ ethers.AnyValue
        //   );
      });

      it('should generate unique messageId including destDAppAddress', async function () {
        const { hub, dAppAddress } = await loadFixture(deployHubFixture);
        const { mockBridge } = await loadFixture(deployMockBridgeFixture);

        await hub.setBridgeEndpoint(mockBridge.target);

        // TODO: Submit two identical proofs and verify messageIds are different
        // This tests the nonce increment
      });

      it('should encode bridge payload correctly', async function () {
        const { hub } = await loadFixture(deployHubFixture);
        const { mockBridge } = await loadFixture(deployMockBridgeFixture);

        await hub.setBridgeEndpoint(mockBridge.target);

        // TODO: Verify bridge payload format
        // Expected: abi.encode(messageId, destDAppAddress, configId, output, userDataToPass)
      });
    });

    describe('Proof Verification Integration', function () {
      it('should execute full proof verification flow', async function () {
        // TODO: Test that multichain path executes same verification as verify()
        // - Groth16 proof verification
        // - OFAC checks
        // - Age verification
        // - Forbidden country checks
      });

      it('should handle invalid proof correctly', async function () {
        // TODO: Submit invalid proof and verify it reverts before bridging
      });

      it('should handle OFAC sanctions match', async function () {
        // TODO: Submit proof for sanctioned individual and verify rejection
      });

      it('should handle age verification failure', async function () {
        // TODO: Submit proof for underage user and verify rejection
      });
    });

    describe('Edge Cases', function () {
      it('should handle maximum size proof payload', async function () {
        // TODO: Test with very large proof
      });

      it('should handle maximum size userContextData', async function () {
        // TODO: Test with large user context data
      });

      it('should handle zero address in destDAppAddress', async function () {
        // TODO: Verify this is rejected
      });
    });
  });

  describe('verify() - Backwards Compatibility', function () {
    describe('Same-Chain Path (Unchanged)', function () {
      it('should execute same-chain verification exactly as before', async function () {
        // TODO: Test old flow: verifySelfProof on dApp → verify() on Hub
        // Verify it still works without any changes
      });

      it('should emit DisclosureVerified event (not multichain event)', async function () {
        // TODO: Verify correct event type for same-chain
      });

      it('should call back to dApp immediately', async function () {
        // TODO: Verify dApp receives onVerificationSuccess callback
      });
    });

    describe('Multichain Path (Old Route)', function () {
      it('should route to multichain when destChainId != block.chainid', async function () {
        // TODO: Test old multichain routing through verify()
      });

      it('should emit DisclosureProofMultichainInitiated event', async function () {
        // TODO: Verify correct event for multichain route
      });
    });
  });

  describe('Admin Functions', function () {
    it('should allow SECURITY_ROLE to set bridge endpoint', async function () {
      const { hub, owner, user } = await loadFixture(deployHubFixture);

      await expect(hub.connect(owner).setBridgeEndpoint(user.address))
        .to.not.be.reverted;
    });

    it('should allow SECURITY_ROLE to set destination hub', async function () {
      const { hub, owner, destHub } = await loadFixture(deployHubFixture);

      await expect(
        hub.connect(owner).setDestinationHub(8453, ethers.zeroPadValue(destHub.address, 32))
      ).to.not.be.reverted;
    });

    it('should allow SECURITY_ROLE to set destination bridge chain ID', async function () {
      const { hub, owner } = await loadFixture(deployHubFixture);

      await expect(hub.connect(owner).setDestinationBridgeChainId(8453, 30184))
        .to.not.be.reverted;
    });

    it('should prevent non-admin from setting bridge configuration', async function () {
      const { hub, user } = await loadFixture(deployHubFixture);

      await expect(
        hub.connect(user).setBridgeEndpoint(user.address)
      ).to.be.reverted;
    });
  });

  describe('Gas Benchmarks', function () {
    it('should benchmark verifyMultichain() gas cost', async function () {
      // TODO: Measure and log gas cost for multichain verification
    });

    it('should compare multichain vs same-chain gas costs', async function () {
      // TODO: Compare gas costs between the two paths
    });
  });
});
