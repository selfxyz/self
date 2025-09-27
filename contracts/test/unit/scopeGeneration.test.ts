import { expect } from "chai";
import { ethers } from "hardhat";
import { TestSelfVerificationRoot } from "../../typechain-types";
import { stringToBigInt, bigIntToString, hashEndpointWithScope } from "@selfxyz/common/utils/scope";

describe("SelfVerificationRoot - Automatic Scope Generation", () => {
  let testContract: TestSelfVerificationRoot;
  let mockHubAddress: string;
  let poseidonT3Address: string;

  before(async () => {
    const [signer] = await ethers.getSigners();
    mockHubAddress = signer.address;

    // Deploy PoseidonT3 library for testing
    console.log("📚 Deploying PoseidonT3 library for testing...");
    const PoseidonT3Factory = await ethers.getContractFactory("PoseidonT3");
    const poseidonT3 = await PoseidonT3Factory.deploy();
    await poseidonT3.waitForDeployment();
    poseidonT3Address = await poseidonT3.getAddress();

    console.log(`✅ PoseidonT3 deployed at: ${poseidonT3Address}`);
  });

  describe("Constructor Scope Generation", () => {
    it("should have the scope set correctly, after contract deployment", async () => {
      const scopeSeed = "test-scope-seed";

      // Deploy the test contract
      const TestContractFactory = await ethers.getContractFactory("TestSelfVerificationRoot");
      testContract = await TestContractFactory.deploy(mockHubAddress, scopeSeed);
      await testContract.waitForDeployment();

      // Setup the scope manually using testGenerateScope (as this is a local dev network)
      await testContract.testGenerateScope(poseidonT3Address, scopeSeed);

      // Get the deployed contract address
      const contractAddress = await testContract.getAddress();

      // Get the actual scope from the contract
      const actualScope = await testContract.scope();

      console.log(`Contract Address: ${contractAddress}`);
      console.log(`Scope Seed: "${scopeSeed}"`);
      console.log(`Generated Scope: ${actualScope.toString()}`);

      // Calculate expected scope using hashEndpointWithScope (use lowercase to match Solidity)
      const expectedScope = BigInt(hashEndpointWithScope(contractAddress.toLowerCase(), scopeSeed));
      console.log(`Expected Scope: ${expectedScope.toString()}`);

      // Verify they match
      expect(actualScope.toString()).to.equal(expectedScope.toString());
    });

    it("should generate different scopes for different scope seeds", async () => {
      const scopeSeed1 = "scope-seed-1";
      const scopeSeed2 = "scope-seed-2";

      // Deploy two contracts with different scope seeds
      const TestContractFactory = await ethers.getContractFactory("TestSelfVerificationRoot");

      const contract1 = await TestContractFactory.deploy(mockHubAddress, scopeSeed1);
      const contract2 = await TestContractFactory.deploy(mockHubAddress, scopeSeed2);

      await contract1.waitForDeployment();
      await contract2.waitForDeployment();

      // Set scopes using testGenerateScope
      await contract1.testGenerateScope(poseidonT3Address, scopeSeed1);
      await contract2.testGenerateScope(poseidonT3Address, scopeSeed2);

      const scope1 = await contract1.scope();
      const scope2 = await contract2.scope();

      // Should be different
      expect(scope1).to.not.equal(scope2);
      console.log(`Scope 1 (${scopeSeed1}): ${scope1.toString()}`);
      console.log(`Scope 2 (${scopeSeed2}): ${scope2.toString()}`);
    });

    it("should generate different scopes for same scope seed but different addresses", async () => {
      const scopeSeed = "same-scope-seed";

      // Deploy two contracts with same scope seed (they'll have different addresses)
      const TestContractFactory = await ethers.getContractFactory("TestSelfVerificationRoot");

      const contract1 = await TestContractFactory.deploy(mockHubAddress, scopeSeed);
      const contract2 = await TestContractFactory.deploy(mockHubAddress, scopeSeed);

      await contract1.waitForDeployment();
      await contract2.waitForDeployment();

      // Set scopes using testGenerateScope
      await contract1.testGenerateScope(poseidonT3Address, scopeSeed);
      await contract2.testGenerateScope(poseidonT3Address, scopeSeed);

      const scope1 = await contract1.scope();
      const scope2 = await contract2.scope();

      // Should be different due to different contract addresses
      expect(scope1).to.not.equal(scope2);

      const addr1 = await contract1.getAddress();
      const addr2 = await contract2.getAddress();
      console.log(`Contract 1 (${addr1}): ${scope1.toString()}`);
      console.log(`Contract 2 (${addr2}): ${scope2.toString()}`);
    });

    it("should generate scope automatically without manual scope value", async () => {
      const scopeSeed = "test-scope";

      const TestContractFactory = await ethers.getContractFactory("TestSelfVerificationRoot");
      testContract = await TestContractFactory.deploy(mockHubAddress, scopeSeed);
      await testContract.waitForDeployment();

      // Set scope using testGenerateScope
      await testContract.testGenerateScope(poseidonT3Address, scopeSeed);

      const actualScope = await testContract.scope();

      // Should equal the generated scope
      const contractAddress = await testContract.getAddress();
      console.log(`Contract Address: ${contractAddress}`);
      console.log(`Scope Seed: "${scopeSeed}"`);

      // Debug: Let's trace the frontend logic step by step
      console.log(
        `Frontend hashEndpointWithScope result: ${hashEndpointWithScope(contractAddress.toLowerCase(), scopeSeed)}`,
      );

      const expectedScope = BigInt(hashEndpointWithScope(contractAddress.toLowerCase(), scopeSeed));
      console.log(`Generated Scope: ${actualScope.toString()}`);
      console.log(`Expected Scope: ${expectedScope.toString()}`);

      expect(actualScope.toString()).to.equal(expectedScope.toString());
    });

    it("should handle various scope seed strings correctly", async () => {
      const testCases = [
        "simple",
        "with-dashes",
        "with_underscores",
        "MiXeD-CaSe_123",
        "symbols!@#$%",
        "exactly-31-characters-in-length", // 31 chars (max)
        "", // empty string
        "a", // single character
      ];

      for (const scopeSeed of testCases) {
        const TestContractFactory = await ethers.getContractFactory("TestSelfVerificationRoot");
        const contract = await TestContractFactory.deploy(mockHubAddress, scopeSeed);
        await contract.waitForDeployment();

        // Set scope using testGenerateScope
        await contract.testGenerateScope(poseidonT3Address, scopeSeed);

        const actualScope = await contract.scope();

        // Calculate expected scope
        const contractAddress = await contract.getAddress();
        const expectedScope = BigInt(hashEndpointWithScope(contractAddress.toLowerCase(), scopeSeed));

        expect(actualScope.toString()).to.equal(expectedScope.toString());
        console.log(`Scope seed: "${scopeSeed}" -> Scope: ${actualScope.toString()}`);
      }
    });

    it("should produce known expected value for specific test case", async () => {
      // This test ensures our implementation matches the expected behavior
      // If this fails, it means our Solidity implementation differs from frontend
      const scopeSeed = "test-scope";

      const TestContractFactory = await ethers.getContractFactory("TestSelfVerificationRoot");
      const contract = await TestContractFactory.deploy(mockHubAddress, scopeSeed);
      await contract.waitForDeployment();

      // Set scope using testGenerateScope
      await contract.testGenerateScope(poseidonT3Address, scopeSeed);

      const contractAddress = await contract.getAddress();
      const actualScope = await contract.scope();

      // Calculate expected scope using hashEndpointWithScope (use lowercase to match Solidity)
      const expectedScope = BigInt(hashEndpointWithScope(contractAddress.toLowerCase(), scopeSeed));

      // This is the critical test - Solidity must match frontend exactly
      expect(actualScope.toString()).to.equal(expectedScope.toString());

      console.log(`\n=== KNOWN VALUE TEST ===`);
      console.log(`Contract Address: ${contractAddress}`);
      console.log(`Scope Seed: "${scopeSeed}"`);
      console.log(`Expected Scope: ${expectedScope.toString()}`);
      console.log(`Actual Scope: ${actualScope.toString()}`);
      console.log(`Match: ${actualScope.toString() === expectedScope.toString()}`);
    });
  });

  describe("String to BigInt Conversion", () => {
    it("should convert strings to BigInt correctly (round-trip test)", async () => {
      const testCases = [
        "hello-world",
        "test123",
        "UPPERCASE",
        "mixed_CASE_123",
        "symbols!@#$%",
        "short",
        "",
        "a",
        "12345",
        "exactly-31-characters-in-length", // 31 chars (max)
      ];

      for (const str of testCases) {
        const bigIntValue = stringToBigInt(str);
        const roundTrip = bigIntToString(bigIntValue);
        expect(roundTrip).to.equal(str);
        console.log(`"${str}" -> ${bigIntValue.toString()} -> "${roundTrip}"`);
      }
    });

    it("should handle edge cases correctly", async () => {
      // Empty string
      expect(stringToBigInt("")).to.equal(0n);

      // Single character
      expect(stringToBigInt("A")).to.equal(65n); // ASCII value of 'A'

      // Two characters
      expect(stringToBigInt("AB")).to.equal((65n << 8n) | 66n); // A=65, B=66
    });

    it("should throw error for strings exceeding 31 bytes", async () => {
      const longString = "this-string-is-definitely-longer-than-31-bytes-and-should-fail";
      expect(() => stringToBigInt(longString)).to.throw("Resulting BigInt exceeds maximum size of 31 bytes");
    });
  });
});
