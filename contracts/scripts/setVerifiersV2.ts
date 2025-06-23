import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { RegisterVerifierId, DscVerifierId } from "@selfxyz/common";

dotenv.config();

// Define AttestationId constants directly based on values from AttestationId.sol
const AttestationId = {
  // Pad with zeros to create full 32 bytes length
  E_PASSPORT: "0x0000000000000000000000000000000000000000000000000000000000000001",
  EU_ID_CARD: "0x0000000000000000000000000000000000000000000000000000000000000002",
};

console.log("🚀 Starting setVerifiersV2 script...");
console.log("================================");

// Debug logs for paths and files
console.log("📁 File paths:");
console.log("  Current directory:", __dirname);
console.log(
  "  Deployed addresses path:",
  path.join(__dirname, "../ignition/deployments/staging/deployed_addresses.json"),
);
console.log(
  "  Contract ABI path:",
  path.join(__dirname, "../ignition/deployments/staging/artifacts/DeployV2#IdentityVerificationHubImplV2.json"),
);

// Debug logs for environment variables (redacted for security)
console.log("🔐 Environment variables:");
console.log("  CELO_RPC_URL configured:", !!process.env.CELO_ALFAJORES_RPC_URL);
console.log("  PRIVATE_KEY configured:", !!process.env.PRIVATE_KEY);
console.log("  Network:", process.env.NETWORK || "not set");

try {
  console.log("\n📋 Loading deployment data...");
  const deployedAddresses = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../ignition/deployments/staging/deployed_addresses.json"), "utf-8"),
  );
  console.log("✅ Deployed addresses loaded successfully");
  console.log(`   Found ${Object.keys(deployedAddresses).length} deployed contracts`);

  // Log all available contracts for debugging
  console.log("\n📦 Available deployed contracts:");
  Object.keys(deployedAddresses).forEach((key, index) => {
    console.log(`   ${index + 1}. ${key} -> ${deployedAddresses[key]}`);
  });

  const identityVerificationHubAbiFile = fs.readFileSync(
    path.join(__dirname, "../ignition/deployments/staging/artifacts/DeployV2#IdentityVerificationHubImplV2.json"),
    "utf-8",
  );
  console.log("✅ ABI file loaded successfully");

  const identityVerificationHubAbi = JSON.parse(identityVerificationHubAbiFile).abi;
  console.log("✅ ABI parsed successfully");

  function getContractAddressByPartialName(partialName: string): string | unknown {
    console.log(`🔍 Searching for contract with partial name: "${partialName}"`);
    for (const [key, value] of Object.entries(deployedAddresses)) {
      if (key.includes(partialName)) {
        console.log(`   ✅ Found match: ${key} -> ${value}`);
        return value;
      }
    }
    console.log(`   ❌ No match found for: "${partialName}"`);
    return undefined;
  }

  function getContractAddressByExactName(exactName: string): string | unknown {
    console.log(`🎯 Looking for exact contract name: "${exactName}"`);
    if (exactName in deployedAddresses) {
      console.log(`   ✅ Found: ${exactName} -> ${deployedAddresses[exactName]}`);
      return deployedAddresses[exactName];
    }
    console.log(`   ❌ Not found: "${exactName}"`);
    return undefined;
  }

  function getAttestationIdBytes32(attestationIdName: string): string {
    const id = AttestationId[attestationIdName as keyof typeof AttestationId];
    console.log(`🆔 Attestation ID for ${attestationIdName}: ${id}`);
    return id;
  }

  async function main() {
    console.log("\n🌐 Setting up blockchain connection...");
    const provider = new ethers.JsonRpcProvider(process.env.CELO_ALFAJORES_RPC_URL as string);
    console.log("✅ Provider created");

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
    console.log("✅ Wallet created");
    console.log(`   Wallet address: ${wallet.address}`);

    console.log("\n🏢 Setting up hub contract...");
    const hubAddress = deployedAddresses["DeployHubV2#IdentityVerificationHub"];
    console.log("🔍 Hub address lookup result:", hubAddress);

    if (!hubAddress) {
      throw new Error("❌ Hub address not found in deployed_addresses.json");
    }

    const identityVerificationHub = new ethers.Contract(hubAddress, identityVerificationHubAbi, wallet);
    console.log("✅ Contract instance created");
    console.log(`   Hub contract address: ${hubAddress}`);

    // Update registry addresses for different attestation types
    console.log("\n📝 STEP 1: Updating registry addresses...");
    console.log("==========================================");
    const attestationTypes = ["E_PASSPORT", "EU_ID_CARD"];
    for (const attestationType of attestationTypes) {
      console.log(`\n🔄 Processing registry for ${attestationType}:`);

      let registryName: any;
      if (attestationType == "E_PASSPORT") {
        registryName = "DeployRegistryModule#IdentityRegistry";
      } else if (attestationType == "EU_ID_CARD") {
        registryName = "DeployIdCardRegistryModule#IdentityRegistryIdCard";
      }

      console.log(`   Registry name to search: ${registryName}`);

      const registryAddress = getContractAddressByExactName(registryName);

      if (!registryAddress) {
        console.log(`   ⚠️  Skipping registry update for ${attestationType} because no deployed address was found.`);
        continue;
      }

      console.log(`   📍 Registry address found: ${registryAddress}`);
      const attestationId = getAttestationIdBytes32(attestationType);

      try {
        console.log(`   📤 Sending updateRegistry transaction...`);
        const tx = await identityVerificationHub.updateRegistry(attestationId, registryAddress);
        console.log(`   ⏳ Transaction sent: ${tx.hash}`);
        console.log(`   ⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();
        console.log(`   ✅ Registry for ${attestationType} updated successfully!`);
        console.log(`      Transaction hash: ${receipt.hash}`);
        console.log(`      Gas used: ${receipt.gasUsed}`);
      } catch (error) {
        console.error(`   ❌ Error updating registry for ${attestationType}:`, error);
      }
    }

    // Update VC and Disclose circuit verifiers for different attestation types
    console.log("\n📝 STEP 2: Updating VC and Disclose circuit verifiers...");
    console.log("=======================================================");
    for (const attestationType of attestationTypes) {
      console.log(`\n🔄 Processing VC verifier for ${attestationType}:`);

      let verifierName: any;
      if (attestationType == "E_PASSPORT") {
        verifierName = "DeployAllVerifiers#Verifier_vc_and_disclose";
      } else if (attestationType == "EU_ID_CARD") {
        verifierName = "DeployAllVerifiers#Verifier_vc_and_disclose_id";
      }

      console.log(`   Verifier name to search: ${verifierName}`);
      const verifierAddress = getContractAddressByExactName(verifierName);

      if (!verifierAddress) {
        console.log(`   ⚠️  Skipping VC and Disclose circuit update for ${attestationType} because no deployed address was found.`);
        continue;
      }

      console.log(`   📍 Verifier address found: ${verifierAddress}`);
      const attestationId = getAttestationIdBytes32(attestationType);

      try {
        console.log(`   📤 Sending updateVcAndDiscloseCircuit transaction...`);
        const tx = await identityVerificationHub.updateVcAndDiscloseCircuit(attestationId, verifierAddress);
        console.log(`   ⏳ Transaction sent: ${tx.hash}`);
        console.log(`   ⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();
        console.log(`   ✅ VC and Disclose circuit for ${attestationType} updated successfully!`);
        console.log(`      Transaction hash: ${receipt.hash}`);
        console.log(`      Gas used: ${receipt.gasUsed}`);
      } catch (error) {
        console.error(`   ❌ Error updating VC and Disclose circuit for ${attestationType}:`, error);
      }
    }

    // Batch update register circuit verifiers for E_PASSPORT
    console.log("\n📝 STEP 3: Batch updating register circuit verifiers for E_PASSPORT...");
    console.log("=====================================================================");

    console.log("🔍 Discovering register verifiers...");
    const registerVerifierKeys = Object.keys(RegisterVerifierId).filter((key) => isNaN(Number(key)));
    console.log(`   Found ${registerVerifierKeys.length} register verifier keys in enum:`, registerVerifierKeys);

    // Filter out register_id keys for E_PASSPORT (they should only be used for EU_ID_CARD)
    const regularRegisterKeys = registerVerifierKeys.filter(key => !key.startsWith('register_id_'));
    console.log(`   Filtered to ${regularRegisterKeys.length} regular register keys (excluding register_id_*):`, regularRegisterKeys);

    const registerAttestationIds: string[] = [];
    const registerCircuitVerifierIds: number[] = [];
    const registerCircuitVerifierAddresses: string[] = [];

    for (const key of regularRegisterKeys) {
      console.log(`\n   🔄 Processing register verifier: ${key}`);
      const verifierName = `Verifier_${key}`;
      console.log(`      Searching for: ${verifierName}`);
      const verifierAddress = getContractAddressByPartialName(verifierName);

      if (!verifierAddress) {
        console.log(`      ❌ Skipping ${verifierName} because no deployed address was found.`);
        continue;
      }

      const verifierId = RegisterVerifierId[key as keyof typeof RegisterVerifierId];
      console.log(`      ✅ Found verifier: ${verifierName} -> ${verifierAddress}`);
      console.log(`      📋 Verifier ID: ${verifierId} (key: ${key})`);

      registerAttestationIds.push(AttestationId.E_PASSPORT);
      registerCircuitVerifierIds.push(verifierId);
      registerCircuitVerifierAddresses.push(verifierAddress as string);
    }

    console.log(`\n📊 Register verifiers summary for E_PASSPORT:`);
    console.log(`   Total found: ${registerCircuitVerifierIds.length}`);
    console.log(`   Verifier IDs: [${registerCircuitVerifierIds.join(', ')}]`);
    console.log(`   Addresses: [${registerCircuitVerifierAddresses.map(addr => addr.slice(0, 10) + '...').join(', ')}]`);

    if (registerCircuitVerifierIds.length > 0) {
      try {
        console.log(`📤 Sending batchUpdateRegisterCircuitVerifiers transaction for E_PASSPORT...`);
        const tx = await identityVerificationHub.batchUpdateRegisterCircuitVerifiers(
          registerAttestationIds,
          registerCircuitVerifierIds,
          registerCircuitVerifierAddresses,
        );
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();
        console.log(`✅ Register circuit verifiers for E_PASSPORT updated successfully!`);
        console.log(`   Transaction hash: ${receipt.hash}`);
        console.log(`   Gas used: ${receipt.gasUsed}`);
      } catch (error) {
        console.error("❌ Error batch updating register circuit verifiers for E_PASSPORT:", error);
      }
    } else {
      console.log("⚠️  No register circuit verifiers found for E_PASSPORT");
    }

    // Batch update register circuit verifiers for EU_ID_CARD (using register_id verifiers)
    console.log("\n📝 STEP 4: Batch updating register circuit verifiers for EU_ID_CARD...");
    console.log("====================================================================");

    // Function to map register_id circuit names to their corresponding RegisterVerifierId
    function getRegisterIdMapping(registerIdCircuitName: string): number | null {
      console.log(`   🔄 Mapping register_id circuit: ${registerIdCircuitName}`);

      // The register_id circuits should have their own entries in the RegisterVerifierId enum
      // Look for exact match first
      if (registerIdCircuitName in RegisterVerifierId) {
        const verifierId = RegisterVerifierId[registerIdCircuitName as keyof typeof RegisterVerifierId];
        console.log(`      ✅ Found direct mapping: ${registerIdCircuitName} (ID: ${verifierId})`);
        return verifierId as number;
      }

      console.warn(`      ❌ No RegisterVerifierId mapping found for: ${registerIdCircuitName}`);
      return null;
    }

    // Get all register_id verifiers from deployed addresses
    console.log("🔍 Discovering register_id verifiers...");
    const registerIdVerifiers: string[] = [];
    for (const key of Object.keys(deployedAddresses)) {
      if (key.includes("Verifier_register_id_")) {
        const circuitName = key.replace("DeployAllVerifiers#Verifier_", "");
        registerIdVerifiers.push(circuitName);
        console.log(`   Found register_id verifier: ${circuitName}`);
      }
    }

    console.log(`📊 Found ${registerIdVerifiers.length} register_id verifier(s): [${registerIdVerifiers.join(', ')}]`);

    const registerIdAttestationIds: string[] = [];
    const registerIdCircuitVerifierIds: number[] = [];
    const registerIdCircuitVerifierAddresses: string[] = [];

    for (const registerIdCircuitName of registerIdVerifiers) {
      console.log(`\n   🔄 Processing register_id verifier: ${registerIdCircuitName}`);
      const verifierName = `DeployAllVerifiers#Verifier_${registerIdCircuitName}`;
      console.log(`      Full verifier name: ${verifierName}`);
      const verifierAddress = getContractAddressByExactName(verifierName);

      if (!verifierAddress) {
        console.log(`      ❌ Skipping ${verifierName} because no deployed address was found.`);
        continue;
      }

      const verifierId = getRegisterIdMapping(registerIdCircuitName);
      if (verifierId === null) {
        console.log(`      ❌ Skipping ${registerIdCircuitName} because no RegisterVerifierId mapping was found.`);
        continue;
      }

      console.log(`      ✅ Using register_id verifier: ${registerIdCircuitName} (ID: ${verifierId}) for EU_ID_CARD`);
      console.log(`      📍 Address: ${verifierAddress}`);

      registerIdAttestationIds.push(AttestationId.EU_ID_CARD);
      registerIdCircuitVerifierIds.push(verifierId);
      registerIdCircuitVerifierAddresses.push(verifierAddress as string);
    }

    console.log(`\n📊 Register_id verifiers summary for EU_ID_CARD:`);
    console.log(`   Total found: ${registerIdCircuitVerifierIds.length}`);
    console.log(`   Verifier IDs: [${registerIdCircuitVerifierIds.join(', ')}]`);
    console.log(`   Addresses: [${registerIdCircuitVerifierAddresses.map(addr => addr.slice(0, 10) + '...').join(', ')}]`);

    if (registerIdCircuitVerifierIds.length > 0) {
      try {
        console.log(`📤 Sending batchUpdateRegisterCircuitVerifiers transaction for EU_ID_CARD...`);
        const tx = await identityVerificationHub.batchUpdateRegisterCircuitVerifiers(
          registerIdAttestationIds,
          registerIdCircuitVerifierIds,
          registerIdCircuitVerifierAddresses,
        );
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();
        console.log(`✅ Register circuit verifiers for EU_ID_CARD updated successfully!`);
        console.log(`   Transaction hash: ${receipt.hash}`);
        console.log(`   Gas used: ${receipt.gasUsed}`);
        console.log(`   Updated ${registerIdCircuitVerifierIds.length} verifier(s) with IDs: [${registerIdCircuitVerifierIds.join(', ')}]`);
      } catch (error) {
        console.error("❌ Error batch updating register circuit verifiers for EU_ID_CARD:", error);
      }
    } else {
      console.log("⚠️  No register_id circuit verifiers found to update for EU_ID_CARD");
    }

    // Batch update DSC circuit verifiers for E_PASSPORT
    console.log("\n📝 STEP 5: Batch updating DSC circuit verifiers for E_PASSPORT...");
    console.log("===============================================================");

    console.log("🔍 Discovering DSC verifiers...");
    const dscKeys = Object.keys(DscVerifierId).filter((key) => isNaN(Number(key)));
    console.log(`   Found ${dscKeys.length} DSC verifier keys in enum:`, dscKeys);

    const dscAttestationIds: string[] = [];
    const dscCircuitVerifierIds: number[] = [];
    const dscCircuitVerifierAddresses: string[] = [];

    for (const key of dscKeys) {
      console.log(`\n   🔄 Processing DSC verifier: ${key}`);
      const verifierName = `Verifier_${key}`;
      console.log(`      Searching for: ${verifierName}`);
      const verifierAddress = getContractAddressByPartialName(verifierName);

      if (!verifierAddress) {
        console.log(`      ❌ Skipping ${verifierName} because no deployed address was found.`);
        continue;
      }

      const verifierId = DscVerifierId[key as keyof typeof DscVerifierId];
      console.log(`      ✅ Found verifier: ${verifierName} -> ${verifierAddress}`);
      console.log(`      📋 Verifier ID: ${verifierId}`);

      dscAttestationIds.push(AttestationId.E_PASSPORT);
      dscCircuitVerifierIds.push(verifierId);
      dscCircuitVerifierAddresses.push(verifierAddress as string);
    }

    console.log(`\n📊 DSC verifiers summary for E_PASSPORT:`);
    console.log(`   Total found: ${dscCircuitVerifierIds.length}`);
    console.log(`   Verifier IDs: [${dscCircuitVerifierIds.join(', ')}]`);
    console.log(`   Addresses: [${dscCircuitVerifierAddresses.map(addr => addr.slice(0, 10) + '...').join(', ')}]`);

    if (dscCircuitVerifierIds.length > 0) {
      try {
        console.log(`📤 Sending batchUpdateDscCircuitVerifiers transaction for E_PASSPORT...`);
        const tx = await identityVerificationHub.batchUpdateDscCircuitVerifiers(
          dscAttestationIds,
          dscCircuitVerifierIds,
          dscCircuitVerifierAddresses,
        );
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();
        console.log(`✅ DSC circuit verifiers for E_PASSPORT updated successfully!`);
        console.log(`   Transaction hash: ${receipt.hash}`);
        console.log(`   Gas used: ${receipt.gasUsed}`);
      } catch (error) {
        console.error("❌ Error batch updating DSC circuit verifiers for E_PASSPORT:", error);
      }
    } else {
      console.log("⚠️  No DSC circuit verifiers found for E_PASSPORT");
    }

    // Batch update DSC circuit verifiers for EU_ID_CARD
    console.log("\n📝 STEP 6: Batch updating DSC circuit verifiers for EU_ID_CARD...");
    console.log("===============================================================");

    const dscIdAttestationIds: string[] = [];
    const dscIdCircuitVerifierIds: number[] = [];
    const dscIdCircuitVerifierAddresses: string[] = [];

    for (const key of dscKeys) {
      console.log(`\n   🔄 Processing DSC verifier for EU_ID_CARD: ${key}`);
      const verifierName = `Verifier_${key}`;
      console.log(`      Searching for: ${verifierName}`);
      const verifierAddress = getContractAddressByPartialName(verifierName);

      if (!verifierAddress) {
        console.log(`      ❌ Skipping ${verifierName} because no deployed address was found.`);
        continue;
      }

      const verifierId = DscVerifierId[key as keyof typeof DscVerifierId];
      console.log(`      ✅ Found verifier: ${verifierName} -> ${verifierAddress}`);
      console.log(`      📋 Verifier ID: ${verifierId}`);

      dscIdAttestationIds.push(AttestationId.EU_ID_CARD);
      dscIdCircuitVerifierIds.push(verifierId);
      dscIdCircuitVerifierAddresses.push(verifierAddress as string);
    }

    console.log(`\n📊 DSC verifiers summary for EU_ID_CARD:`);
    console.log(`   Total found: ${dscIdCircuitVerifierIds.length}`);
    console.log(`   Verifier IDs: [${dscIdCircuitVerifierIds.join(', ')}]`);
    console.log(`   Addresses: [${dscIdCircuitVerifierAddresses.map(addr => addr.slice(0, 10) + '...').join(', ')}]`);

    if (dscIdCircuitVerifierIds.length > 0) {
      try {
        console.log(`📤 Sending batchUpdateDscCircuitVerifiers transaction for EU_ID_CARD...`);
        const tx = await identityVerificationHub.batchUpdateDscCircuitVerifiers(
          dscIdAttestationIds,
          dscIdCircuitVerifierIds,
          dscIdCircuitVerifierAddresses,
        );
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();
        console.log(`✅ DSC circuit verifiers for EU_ID_CARD updated successfully!`);
        console.log(`   Transaction hash: ${receipt.hash}`);
        console.log(`   Gas used: ${receipt.gasUsed}`);
      } catch (error) {
        console.error("❌ Error batch updating DSC circuit verifiers for EU_ID_CARD:", error);
      }
    } else {
      console.log("⚠️  No DSC circuit verifiers found for EU_ID_CARD");
    }

    console.log("\n🎉 Script execution completed!");
    console.log("===============================");
  }

  main().catch((error) => {
    console.error("💥 Execution error:", error);
    if (error.reason) console.error("   Reason:", error.reason);
    if (error.code) console.error("   Code:", error.code);
    if (error.transaction) console.error("   Transaction:", error.transaction);
    process.exitCode = 1;
  });
} catch (error) {
  console.error("💥 Initial setup error:", error);
  process.exitCode = 1;
}
