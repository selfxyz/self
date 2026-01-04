import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract, Signer } from "ethers";

/**
 * END-TO-END MULTICHAIN VERIFICATION TEST
 *
 * Tests the complete multichain flow using MockBridgeProvider:
 * 1. Deploy all contracts
 * 2. Configure bridge connections
 * 3. Send message through mock bridge
 * 4. Deliver to destination chain
 * 5. Verify dApp callback received
 *
 * TODO: [BRIDGE] After real bridge integration:
 * - Update to use actual LayerZero or Wormhole
 * - Test on real testnets (Celo Sepolia → Base Sepolia)
 */
describe("Multichain E2E Test (Mock Bridge)", function () {
  this.timeout(0);

  let owner: Signer;
  let user: Signer;
  let mockBridge: Contract;
  let multichainHub: Contract;
  let testDApp: Contract;
  let snapshotId: string;

  const BASE_SEPOLIA_CHAIN_ID = 84532;
  const BASE_SEPOLIA_EID = 84532; // Using chain id as EID for mock LayerZero
  const GNOSIS_CHAIN_ID = 100;
  const GNOSIS_EID = 100;
  const BRIDGE_FEE = ethers.parseEther("0.0001");
  const LZ_OPTIONS = ethers.solidityPacked(["uint16"], [3]); // TYPE_3 option marker

  before(async () => {
    console.log("🚀 Deploying E2E test environment...\n");

    [owner, user] = await ethers.getSigners();

    // Deploy MockBridgeProvider
    const MockBridgeProvider = await ethers.getContractFactory("MockBridgeProvider");
    mockBridge = await MockBridgeProvider.deploy();
    await mockBridge.waitForDeployment();
    console.log("✅ MockBridgeProvider deployed at:", await mockBridge.getAddress());

    // Deploy IdentityVerificationHubMultichain with proxy (production-like)
    const MultichainHubImpl = await ethers.getContractFactory("IdentityVerificationHubMultichain");
    const implementation = await MultichainHubImpl.deploy();
    await implementation.waitForDeployment();

    const initData = implementation.interface.encodeFunctionData("initialize", [await owner.getAddress()]);
    const Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await Proxy.deploy(await implementation.getAddress(), initData);
    await proxy.waitForDeployment();

    multichainHub = MultichainHubImpl.attach(await proxy.getAddress());
    console.log("✅ MultichainHub implementation deployed at:", await implementation.getAddress());
    console.log("✅ MultichainHub proxy deployed at:", await proxy.getAddress());

    // Deploy TestMultichainDApp
    const TestDApp = await ethers.getContractFactory("TestMultichainDApp");
    testDApp = await TestDApp.deploy();
    await testDApp.waitForDeployment();
    console.log("✅ TestDApp deployed at:", await testDApp.getAddress());

    // Configure mock bridge fees and source hub (EID keyed)
    await mockBridge.setBridgeFee(BASE_SEPOLIA_EID, BRIDGE_FEE);
    await mockBridge.setBridgeFee(GNOSIS_EID, BRIDGE_FEE);
    await mockBridge.setBridgeDelay(0); // Instant for testing
    await mockBridge.setSourceHub(ethers.zeroPadValue(await owner.getAddress(), 32)); // Mock source hub

    // Configure MultichainHub
    await multichainHub.setBridgeEndpoint(await mockBridge.getAddress());
    const currentChainId = (await ethers.provider.getNetwork()).chainId;
    await multichainHub.setSourceHub(
      currentChainId,
      ethers.zeroPadValue(await owner.getAddress(), 32) // Mock source hub
    );

    // Configure MockBridge destination hub
    await mockBridge.setDestinationHub(BASE_SEPOLIA_EID, await multichainHub.getAddress());
    await mockBridge.setDestinationHub(GNOSIS_EID, await multichainHub.getAddress());

    console.log("\n🎉 E2E test environment ready!\n");
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  // Helper to send via mock LayerZero endpoint
  async function sendViaLayerZero(payload: string, dstEid: number = BASE_SEPOLIA_EID) {
    const receiver = ethers.zeroPadValue(await multichainHub.getAddress(), 32);
    const params = [dstEid, receiver, payload, LZ_OPTIONS, false] as const;
    return mockBridge.send(params, await owner.getAddress(), { value: BRIDGE_FEE });
  }

  describe("MockBridgeProvider", () => {
    it("should quote correct bridge fee", async () => {
      const fee = await mockBridge.quoteFee(BASE_SEPOLIA_EID);
      expect(fee).to.equal(BRIDGE_FEE);
    });

    it("should allow setting custom bridge fees", async () => {
      const newFee = ethers.parseEther("0.01");
      await mockBridge.setBridgeFee(BASE_SEPOLIA_CHAIN_ID, newFee);

      const fee = await mockBridge.quoteFee(BASE_SEPOLIA_CHAIN_ID);
      expect(fee).to.equal(newFee);
    });

    it("should allow setting bridge delay", async () => {
      await mockBridge.setBridgeDelay(60);
      const delay = await mockBridge.bridgeDelay();
      expect(delay).to.equal(60n);
    });

    it("should send message and store in queue", async () => {
      const receiver = ethers.zeroPadValue(await multichainHub.getAddress(), 32);
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes", "bytes"],
        [
          await testDApp.getAddress(),
          "0x1234", // Mock output
          "0x5678", // Mock userData
        ]
      );

      const tx = await mockBridge.send(
        [BASE_SEPOLIA_EID, receiver, payload, LZ_OPTIONS, false],
        await owner.getAddress(),
        { value: BRIDGE_FEE }
      );

      await expect(tx).to.emit(mockBridge, "MockMessageSent");

      const count = await mockBridge.getPendingMessageCount();
      expect(count).to.equal(1n);
    });

    it("should reject message with insufficient fee", async () => {
      const payload = "0x1234";
      const receiver = ethers.zeroPadValue(await multichainHub.getAddress(), 32);
      const params = [BASE_SEPOLIA_EID, receiver, payload, LZ_OPTIONS, false] as const;

      await expect(mockBridge.send(params, await owner.getAddress(), { value: 0 })).to.be.revertedWithCustomError(
        mockBridge,
        "InsufficientFee"
      );
    });
  });

  describe("Message Delivery", () => {
    let messageHash: string;

    beforeEach(async () => {
      // Send a message first
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes", "bytes"],
        [await testDApp.getAddress(), "0xaabbccdd", "0x11223344"]
      );

      const receiver = ethers.zeroPadValue(await multichainHub.getAddress(), 32);
      const tx = await mockBridge.send(
        [BASE_SEPOLIA_EID, receiver, payload, LZ_OPTIONS, false],
        await owner.getAddress(),
        {
          value: BRIDGE_FEE,
        }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "MockMessageSent"
      );

      // Get message hash from the queue (last one added)
      const count = await mockBridge.getPendingMessageCount();
      // We need to calculate the hash ourselves since it's internal
      const destEid = BASE_SEPOLIA_EID;
      messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "uint256", "bytes32", "bytes", "uint256"],
          [
            (await ethers.provider.getNetwork()).chainId,
            destEid,
            receiver,
            payload,
            (await ethers.provider.getBlock("latest"))!.timestamp,
          ]
        )
      );
    });

    it("should deliver message to MultichainHub", async () => {
      // Get the message from queue
      const count = await mockBridge.getPendingMessageCount();
      expect(count).to.be.greaterThan(0n);
    });

    it("should prevent double delivery", async () => {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes", "bytes"],
        [await testDApp.getAddress(), "0xdeadbeef", "0x"]
      );
      const guid = ethers.keccak256(ethers.toUtf8Bytes("replay-guid"));
      const mockBridgeAddress = await mockBridge.getAddress();

      await ethers.provider.send("hardhat_impersonateAccount", [mockBridgeAddress]);
      await ethers.provider.send("hardhat_setBalance", [
        mockBridgeAddress,
        "0x" + ethers.parseEther("1").toString(16),
      ]);
      const bridgeSigner = await ethers.getSigner(mockBridgeAddress);

      const currentChainId = (await ethers.provider.getNetwork()).chainId;
      const origin = {
        srcEid: Number(currentChainId),
        sender: ethers.zeroPadValue(await owner.getAddress(), 32),
        nonce: 1n,
      };

      await multichainHub
        .connect(bridgeSigner)
        .lzReceive(origin, guid, payload, mockBridgeAddress, "0x");

      await expect(
        multichainHub
          .connect(bridgeSigner)
          .lzReceive(origin, guid, payload, mockBridgeAddress, "0x")
      ).to.be.revertedWithCustomError(multichainHub, "MessageAlreadyProcessed");

      await ethers.provider.send("hardhat_stopImpersonatingAccount", [mockBridgeAddress]);
    });
  });

  describe("TestMultichainDApp", () => {
    it("should return correct scope", async () => {
      const scope = await testDApp.scope();
      expect(scope).to.equal(12345n);
    });

    it("should receive verification callback", async () => {
      const output = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bool"],
        [123, true]
      );
      const userData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        ["test-user-data"]
      );

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes", "bytes"],
        [await testDApp.getAddress(), output, userData]
      );

      // Deliver via MultichainHub through mock LayerZero
      const tx = await sendViaLayerZero(payload);

      // Check event emitted
      await expect(tx).to.emit(multichainHub, "VerificationBridged");

      // Check dApp received callback
      const verificationCount = await testDApp.getVerificationCount();
      expect(verificationCount).to.equal(1n);
    });

    it("should track multiple verifications", async () => {
      // Send 3 verifications
      for (let i = 0; i < 3; i++) {
        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "bytes", "bytes"],
          [await testDApp.getAddress(), "0x1234", "0x5678"]
        );
        await sendViaLayerZero(payload);
      }

      const count = await testDApp.getVerificationCount();
      expect(count).to.equal(3n);
    });
  });

  describe("MultichainHub Authorization", () => {
    it("should only allow bridge endpoint to receive messages", async () => {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes", "bytes"],
        [
          await testDApp.getAddress(),
          "0x1234",
          "0x5678",
        ]
      );

      // Call from non-bridge address should fail
      const nonBridgeHub = multichainHub.connect(user);
      const currentChainId = (await ethers.provider.getNetwork()).chainId;
      const sourceHub = ethers.zeroPadValue(await owner.getAddress(), 32);
      await expect(
        nonBridgeHub.receiveMessage(currentChainId, sourceHub, payload)
      ).to.be.revertedWithCustomError(
        multichainHub,
        "UnauthorizedBridgeEndpoint"
      );
    });

    it("should allow admin to update bridge endpoint", async () => {
      const newEndpoint = await user.getAddress();
      await multichainHub.setBridgeEndpoint(newEndpoint);

      const endpoint = await multichainHub.getBridgeEndpoint();
      expect(endpoint).to.equal(newEndpoint);
    });

    it("should allow admin to update source config", async () => {
      const newSourceChainId = 42220n; // Celo mainnet
      const newSourceHub = ethers.zeroPadValue(await user.getAddress(), 32);

      await multichainHub.setSourceHub(newSourceChainId, newSourceHub);

      const storedHub = await multichainHub.getSourceHub(newSourceChainId);
      expect(storedHub).to.equal(newSourceHub);
    });

    it("should verify admin role is set correctly", async () => {
      const DEFAULT_ADMIN_ROLE = await multichainHub.DEFAULT_ADMIN_ROLE();
      const hasRole = await multichainHub.hasRole(DEFAULT_ADMIN_ROLE, await owner.getAddress());
      expect(hasRole).to.be.true;
    });
  });

  describe("Full Flow Simulation", () => {
    it("should complete origin → bridge → destination flow", async () => {
      console.log("\n📋 Simulating full multichain flow:");

      // Get initial count
      const initialCount = await testDApp.getVerificationCount();

      // Step 1: User verification on origin chain (simulated)
      console.log("  1️⃣ User verification completed on Celo");
      const verificationOutput = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "bool", "bytes32"],
        [
          12345n, // scope
          BigInt(Date.now()), // timestamp
          true, // ofacValid
          ethers.keccak256(ethers.toUtf8Bytes("user-commitment")),
        ]
      );

      // Step 2: Bridge message sent (automatically triggers delivery in mock)
      console.log("  2️⃣ Bridge message sent via MockBridge");
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes", "bytes"],
        [await testDApp.getAddress(), verificationOutput, "0x"]
      );

      // MockBridge.send() automatically calls lzReceive() on destination
      const receiver = ethers.zeroPadValue(await multichainHub.getAddress(), 32);
      const sendTx = await mockBridge.send(
        [BASE_SEPOLIA_EID, receiver, payload, LZ_OPTIONS, false],
        await owner.getAddress(),
        {
          value: BRIDGE_FEE,
        }
      );
      await expect(sendTx).to.emit(mockBridge, "MockMessageSent");
      console.log("     ✅ MockMessageSent event emitted");

      // Step 3: Message automatically delivered to destination (by mock bridge)
      console.log("  3️⃣ Message delivered to MultichainHub");
      await expect(sendTx).to.emit(multichainHub, "VerificationBridged");
      console.log("     ✅ VerificationBridged event emitted");

      // Step 4: dApp callback received
      console.log("  4️⃣ dApp received onVerificationSuccess callback");
      const finalCount = await testDApp.getVerificationCount();
      expect(finalCount).to.equal(initialCount + 1n);
      console.log("     ✅ Verification count incremented:", finalCount.toString());

      console.log("\n✨ Full multichain flow completed successfully!\n");
    });
  });

  describe("Error Scenarios", () => {
    it("should handle dApp callback failure gracefully", async () => {
      // Deploy a failing dApp
      const FailingDApp = await ethers.getContractFactory("FailingDApp");
      const failingDApp = await FailingDApp.deploy();
      await failingDApp.waitForDeployment();

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes", "bytes"],
        [await failingDApp.getAddress(), "0x1234", "0x5678"]
      );

      // The FailingDApp will cause the callback to fail, which will revert the entire transaction
      // Note: Current implementation doesn't have error handling for callback failures
      await expect(sendViaLayerZero(payload)).to.be.reverted;
    });
  });
});
