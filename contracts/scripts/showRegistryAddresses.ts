import * as fs from "fs";
import * as path from "path";

async function showRegistryAddresses() {
  console.log("🔍 Registry Deployment Addresses:");
  console.log("================================");

  try {
    // Read the deployed addresses from the deployment artifacts
    const deployedAddressesPath = path.join(__dirname, "../ignition/deployments/chain-11142220/deployed_addresses.json");

    if (!fs.existsSync(deployedAddressesPath)) {
      console.log("❌ No deployment found for chain 11142220 (Sepolia)");
      console.log("   Please run: yarn deploy:registry");
      return;
    }

    const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

    // Show registry-related addresses
    const registryKeys = Object.keys(deployedAddresses).filter((key) => key.startsWith("DeployRegistryModule#"));

    if (registryKeys.length === 0) {
      console.log("❌ No registry contracts found in deployed addresses");
      console.log("   Available deployments:", Object.keys(deployedAddresses));
      return;
    }

    registryKeys.forEach((key) => {
      const contractName = key.replace("DeployRegistryModule#", "");
      const address = deployedAddresses[key];
      let emoji = "📝";

      if (contractName === "PoseidonT3") emoji = "📚";
      else if (contractName === "IdentityRegistryImplV1") emoji = "🏗️";
      else if (contractName === "IdentityRegistry") emoji = "🚀";

      console.log(`${emoji} ${contractName}:`);
      console.log(`   ${address}`);
    });

    console.log("\n✅ Registry deployment complete!");
  } catch (error) {
    console.error("❌ Error reading deployment addresses:", error);
  }
}

showRegistryAddresses().catch(console.error);
