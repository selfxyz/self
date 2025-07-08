import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts } from "hardhat";
import { ethers } from "ethers";

export default buildModule("DeployIdCardRegistryModule", (m) => {
  const poseidonT3 = m.library("PoseidonT3");

  const identityRegistryIdCardImpl = m.contract("IdentityRegistryIdCardImplV1", [], {
    libraries: { PoseidonT3: poseidonT3 },
  });

  const registryInterface = getRegistryInitializeData();
  const registryInitData = registryInterface.encodeFunctionData("initialize", [
    "0x0000000000000000000000000000000000000000",
  ]);

  const idCardRegistry = m.contract("IdentityRegistry", [identityRegistryIdCardImpl, registryInitData]);

  return {
    poseidonT3,
    identityRegistryIdCardImpl,
    idCardRegistry,
  };
});

function getRegistryInitializeData() {
  const registryArtifact = artifacts.readArtifactSync("IdentityRegistryIdCardImplV1");
  const registryInterface = new ethers.Interface(registryArtifact.abi);
  return registryInterface;
}
