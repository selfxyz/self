// SPDX-License-Identifier: MIT
// Test suite for IdentityVerificationHubMultichain (destination chain contract)

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import type { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('IdentityVerificationHubMultichain', function () {
  // Test constants
  const CELO_MAINNET_CHAIN_ID = 42220;
  const CELO_SEPOLIA_CHAIN_ID = 11142220;

  // Fixtures for test setup
  async function deployMultichainHubFixture() {
    const [owner, bridgeEndpoint, sourceHub, dAppContract, nonAdmin] = await ethers.getSigners();

    // Deploy Multichain Hub contract with proxy (production pattern)
    const MultichainHubImpl = await ethers.getContractFactory('IdentityVerificationHubMultichain');
    const implementation = await MultichainHubImpl.deploy();
    await implementation.waitForDeployment();

    const initData = implementation.interface.encodeFunctionData('initialize', [owner.address]);
    const Proxy = await ethers.getContractFactory('ERC1967Proxy');
    const proxy = await Proxy.deploy(await implementation.getAddress(), initData);
    await proxy.waitForDeployment();

    const multichainHub = MultichainHubImpl.attach(await proxy.getAddress());

    // Configure bridge and source hub
    await multichainHub.setBridgeEndpoint(bridgeEndpoint.address);
    await multichainHub.setSourceHub(
      CELO_MAINNET_CHAIN_ID,
      ethers.zeroPadValue(sourceHub.address, 32)
    );
    await multichainHub.setSourceHub(
      CELO_SEPOLIA_CHAIN_ID,
      ethers.zeroPadValue(sourceHub.address, 32)
    );

    return {
      multichainHub,
      owner,
      bridgeEndpoint,
      sourceHub,
      dAppContract,
      nonAdmin,
    };
  }

  async function deployMockDAppFixture() {
    const MockDApp = await ethers.getContractFactory('TestMultichainDApp');
    const mockDApp = await MockDApp.deploy();
    await mockDApp.waitForDeployment();

    return { mockDApp };
  }

  describe('Initialization', function () {
    it('should initialize with correct admin', async function () {
      const { multichainHub, owner } = await loadFixture(deployMultichainHubFixture);

      const DEFAULT_ADMIN_ROLE = await multichainHub.DEFAULT_ADMIN_ROLE();
      expect(await multichainHub.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it('should grant SECURITY_ROLE to admin', async function () {
      const { multichainHub, owner } = await loadFixture(deployMultichainHubFixture);

      const SECURITY_ROLE = await multichainHub.SECURITY_ROLE();
      expect(await multichainHub.hasRole(SECURITY_ROLE, owner.address)).to.be.true;
    });
  });

  describe('receiveMessage()', function () {
    describe('Access Control', function () {
      it('should revert with UnauthorizedBridgeEndpoint if caller is not bridge', async function () {
        const { multichainHub, sourceHub, dAppContract, nonAdmin } =
          await loadFixture(deployMultichainHubFixture);

        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'bytes', 'bytes'],
          [
            dAppContract.address,
            '0x', // output
            '0x', // userDataToPass
          ]
        );

        await expect(
          multichainHub
            .connect(nonAdmin)
            .receiveMessage(
              CELO_MAINNET_CHAIN_ID,
              ethers.zeroPadValue(sourceHub.address, 32),
              payload
            )
        ).to.be.revertedWithCustomError(multichainHub, 'UnauthorizedBridgeEndpoint');
      });

      it('should revert with UntrustedSourceChain for unknown source chain', async function () {
        const { multichainHub, bridgeEndpoint, sourceHub, dAppContract } =
          await loadFixture(deployMultichainHubFixture);

        const unknownChainId = 999999;
        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'bytes', 'bytes'],
          [
            dAppContract.address,
            '0x',
            '0x',
          ]
        );

        await expect(
          multichainHub
            .connect(bridgeEndpoint)
            .receiveMessage(
              unknownChainId,
              ethers.zeroPadValue(sourceHub.address, 32),
              payload
            )
        ).to.be.revertedWithCustomError(multichainHub, 'UntrustedSourceChain');
      });

      it('should revert with UntrustedSourceHub if source hub does not match', async function () {
        const { multichainHub, bridgeEndpoint, dAppContract, nonAdmin } =
          await loadFixture(deployMultichainHubFixture);

        const wrongSourceHub = nonAdmin.address;
        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'bytes', 'bytes'],
          [
            dAppContract.address,
            '0x',
            '0x',
          ]
        );

        await expect(
          multichainHub
            .connect(bridgeEndpoint)
            .receiveMessage(
              CELO_MAINNET_CHAIN_ID,
              ethers.zeroPadValue(wrongSourceHub, 32),
              payload
            )
        ).to.be.revertedWithCustomError(multichainHub, 'UntrustedSourceHub');
      });
    });

    describe('Payload Validation', function () {
      it('should revert with InvalidDestinationContract if destDAppAddress is zero', async function () {
        const { multichainHub, bridgeEndpoint, sourceHub } =
          await loadFixture(deployMultichainHubFixture);

        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'bytes', 'bytes'],
          [
            ethers.ZeroAddress, // Invalid zero address
            '0x',
            '0x',
          ]
        );

        await expect(
          multichainHub
            .connect(bridgeEndpoint)
            .receiveMessage(
              CELO_MAINNET_CHAIN_ID,
              ethers.zeroPadValue(sourceHub.address, 32),
              payload
            )
        ).to.be.revertedWithCustomError(multichainHub, 'InvalidDestinationContract');
      });

      it('should decode payload correctly', async function () {
        const { multichainHub, bridgeEndpoint, sourceHub } =
          await loadFixture(deployMultichainHubFixture);
        const { mockDApp } = await loadFixture(deployMockDAppFixture);

        const output = ethers.hexlify(ethers.randomBytes(100));
        const userDataToPass = ethers.hexlify(ethers.randomBytes(50));

        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'bytes', 'bytes'],
          [mockDApp.target, output, userDataToPass]
        );

        // TODO: Capture event and verify payload was decoded correctly
        const tx = await multichainHub
          .connect(bridgeEndpoint)
          .receiveMessage(
            CELO_MAINNET_CHAIN_ID,
            ethers.zeroPadValue(sourceHub.address, 32),
            payload
          );

        // Verify VerificationBridged event emitted with correct parameters
        // await expect(tx)
        //   .to.emit(multichainHub, 'VerificationBridged')
        //   .withArgs(messageId, mockDApp.target, configId, output, userDataToPass, ethers.AnyValue);
      });
    });

    describe('Successful Message Reception', function () {
      it('should call onVerificationSuccess on dApp contract', async function () {
        const { multichainHub, bridgeEndpoint, sourceHub } =
          await loadFixture(deployMultichainHubFixture);
        const { mockDApp } = await loadFixture(deployMockDAppFixture);

        const output = ethers.hexlify(ethers.randomBytes(100));
        const userDataToPass = ethers.hexlify(ethers.randomBytes(50));

        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'bytes', 'bytes'],
          [mockDApp.target, output, userDataToPass]
        );

        await multichainHub
          .connect(bridgeEndpoint)
          .receiveMessage(
            CELO_MAINNET_CHAIN_ID,
            ethers.zeroPadValue(sourceHub.address, 32),
            payload
          );

        // TODO: Verify mockDApp received the callback with correct parameters
        // expect(await mockDApp.lastOutput()).to.equal(output);
        // expect(await mockDApp.lastUserData()).to.equal(userDataToPass);
      });

      it('should emit VerificationBridged event', async function () {
        const { multichainHub, bridgeEndpoint, sourceHub } =
          await loadFixture(deployMultichainHubFixture);
        const { mockDApp } = await loadFixture(deployMockDAppFixture);

        const output = ethers.hexlify(ethers.randomBytes(100));
        const userDataToPass = ethers.hexlify(ethers.randomBytes(50));

        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'bytes', 'bytes'],
          [mockDApp.target, output, userDataToPass]
        );

        const tx = await multichainHub
          .connect(bridgeEndpoint)
          .receiveMessage(
            CELO_MAINNET_CHAIN_ID,
            ethers.zeroPadValue(sourceHub.address, 32),
            payload
          );

        await expect(tx).to.emit(multichainHub, 'VerificationBridged');
      });

      it('should handle multiple messages correctly', async function () {
        // TODO: Test receiving multiple messages in sequence
      });
    });

    describe('ConfigId Validation (Future)', function () {
      it.skip('should validate configId matches dApp configId', async function () {
        // TODO: Implement when dApp contracts have getConfigId() function
        // This test is skipped until that interface is available
      });

      it.skip('should revert with InvalidConfigId if mismatch', async function () {
        // TODO: Implement when validation is added
      });
    });
  });

  describe('Admin Functions', function () {
    describe('setBridgeEndpoint()', function () {
      it('should allow SECURITY_ROLE to set bridge endpoint', async function () {
        const { multichainHub, owner, nonAdmin } = await loadFixture(deployMultichainHubFixture);

        await expect(multichainHub.connect(owner).setBridgeEndpoint(nonAdmin.address))
          .to.not.be.reverted;

        expect(await multichainHub.getBridgeEndpoint()).to.equal(nonAdmin.address);
      });

      it('should emit BridgeEndpointUpdated event', async function () {
        const { multichainHub, owner, bridgeEndpoint, nonAdmin } =
          await loadFixture(deployMultichainHubFixture);

        await expect(multichainHub.connect(owner).setBridgeEndpoint(nonAdmin.address))
          .to.emit(multichainHub, 'BridgeEndpointUpdated')
          .withArgs(bridgeEndpoint.address, nonAdmin.address);
      });

      it('should revert if called by non-admin', async function () {
        const { multichainHub, nonAdmin } = await loadFixture(deployMultichainHubFixture);

        await expect(
          multichainHub.connect(nonAdmin).setBridgeEndpoint(nonAdmin.address)
        ).to.be.reverted;
      });
    });

    describe('setSourceHub()', function () {
      it('should allow SECURITY_ROLE to set source hub', async function () {
        const { multichainHub, owner, nonAdmin } = await loadFixture(deployMultichainHubFixture);

        const testChainId = 999;
        const hubAddress = ethers.zeroPadValue(nonAdmin.address, 32);

        await expect(multichainHub.connect(owner).setSourceHub(testChainId, hubAddress))
          .to.not.be.reverted;

        expect(await multichainHub.getSourceHub(testChainId)).to.equal(hubAddress);
      });

      it('should emit SourceHubUpdated event', async function () {
        const { multichainHub, owner, nonAdmin } = await loadFixture(deployMultichainHubFixture);

        const testChainId = 999;
        const hubAddress = ethers.zeroPadValue(nonAdmin.address, 32);

        await expect(multichainHub.connect(owner).setSourceHub(testChainId, hubAddress))
          .to.emit(multichainHub, 'SourceHubUpdated')
          .withArgs(testChainId, hubAddress);
      });

      it('should revert if called by non-admin', async function () {
        const { multichainHub, sourceHub, nonAdmin } =
          await loadFixture(deployMultichainHubFixture);

        const hubAddress = ethers.zeroPadValue(sourceHub.address, 32);

        await expect(
          multichainHub.connect(nonAdmin).setSourceHub(CELO_MAINNET_CHAIN_ID, hubAddress)
        ).to.be.reverted;
      });
    });
  });

  describe('View Functions', function () {
    it('should return correct bridge endpoint', async function () {
      const { multichainHub, bridgeEndpoint } = await loadFixture(deployMultichainHubFixture);

      expect(await multichainHub.getBridgeEndpoint()).to.equal(bridgeEndpoint.address);
    });

    it('should return correct source hub for chain', async function () {
      const { multichainHub, sourceHub } = await loadFixture(deployMultichainHubFixture);

      const storedHub = await multichainHub.getSourceHub(CELO_MAINNET_CHAIN_ID);
      expect(storedHub).to.equal(ethers.zeroPadValue(sourceHub.address, 32));
    });

    it('should return zero for unconfigured chain', async function () {
      const { multichainHub } = await loadFixture(deployMultichainHubFixture);

      const storedHub = await multichainHub.getSourceHub(999999);
      expect(storedHub).to.equal(ethers.zeroPadValue('0x', 32));
    });
  });

  describe('Upgrade Authorization', function () {
    it('should allow DEFAULT_ADMIN_ROLE to authorize upgrade', async function () {
      // TODO: Test UUPS upgrade authorization
    });

    it('should prevent non-admin from authorizing upgrade', async function () {
      // TODO: Test unauthorized upgrade attempt
    });
  });

  describe('Integration Tests', function () {
    it('should handle realistic verification payload', async function () {
      // TODO: Test with realistic verification data from Celo Hub
    });

    it('should handle large output data', async function () {
      // TODO: Test with maximum size output
    });

    it('should handle empty userDataToPass', async function () {
      // TODO: Test with empty user data
    });
  });
});
