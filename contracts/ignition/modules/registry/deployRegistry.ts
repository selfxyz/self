import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts } from "hardhat";
import { ethers } from "ethers";

export default buildModule("DeployRegistryModule", (m) => {
  // Deploy PoseidonT3
  console.log("📚 Deploying PoseidonT3 library...");
  const poseidonT3 = m.library("PoseidonT3");

  console.log("🏗️  Deploying IdentityRegistryImplV1 implementation...");
  // Deploy IdentityRegistryImplV1
  const identityRegistryImpl = m.contract("IdentityRegistryImplV1", [], {
    libraries: { PoseidonT3: poseidonT3 },
  });

  console.log("⚙️  Preparing registry initialization data...");
  // Get the interface and encode the initialize function call
  const registryInterface = getRegistryInitializeData();

  const registryInitData = registryInterface.encodeFunctionData("initialize", [ethers.ZeroAddress]);
  console.log("   Init data:", registryInitData);

  console.log("🚀 Deploying IdentityRegistry proxy...");
  // Deploy the proxy contract with the implementation address and initialization data
  const registry = m.contract("IdentityRegistry", [identityRegistryImpl, registryInitData]);

  console.log("✅ Registry deployment module setup complete!");
  console.log("   📋 Summary:");
  console.log("   - PoseidonT3: Library");
  console.log("   - IdentityRegistryImplV1: Implementation contract");
  console.log("   - IdentityRegistry: Proxy contract");

  return {
    poseidonT3,
    identityRegistryImpl,
    registry,
  };
});

function getRegistryInitializeData() {
  const registryArtifact = artifacts.readArtifactSync("IdentityRegistryImplV1");
  const registryInterface = new ethers.Interface(registryArtifact.abi);
  return registryInterface;
}
