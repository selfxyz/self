import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
// import { artifacts } from "hardhat";
// import { ethers } from "ethers";

export default buildModule("DeployKycRegistryModule", (m) => {
  // // Deploy PoseidonT3
  // console.log("📚 Deploying PoseidonT3 library...");
  // const poseidonT3 = m.library("PoseidonT3");

  // console.log("🏗️  Deploying IdentityRegistryKycImplV1 implementation...");
  // // Deploy IdentityRegistryImplV1
  // const identityRegistryKycImpl = m.contract("IdentityRegistryKycImplV1", [], {
  //   libraries: { PoseidonT3: poseidonT3 },
  // });

  // console.log("⚙️  Preparing registry initialization data...");
  // // Get the interface and encode the initialize function call
  // const registryInterface = getRegistryInitializeData();

  // const registryInitData = registryInterface.encodeFunctionData("initialize", [ethers.ZeroAddress, ethers.ZeroAddress]);
  // console.log("   Init data:", registryInitData);

  // console.log("🚀 Deploying IdentityRegistry proxy...");
  // // Deploy the proxy contract with the implementation address and initialization data
  // const registry = m.contract("IdentityRegistry", [identityRegistryKycImpl, registryInitData]);

  // Redeploy verifier — circuit changed due to new trusted setup contributions
  const gcpKycVerifier = m.contract("Verifier_gcp_jwt", []);

  // PCR0Manager not deployed - using existing mainnet PCR0Manager at 0x9743fe2C1c3D2b068c56dE314e9B10DA9c904717
  // const pcr0Manager = m.contract("PCR0Manager", []);

  return {
    gcpKycVerifier,
  };
});

// function getRegistryInitializeData() {
//   const registryArtifact = artifacts.readArtifactSync("IdentityRegistryKycImplV1");
//   const registryInterface = new ethers.Interface(registryArtifact.abi);
//   return registryInterface;
// }
