import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getCSCAModulusMerkleTree } from "../../../../common/src/utils/csca";
import { formatRoot } from "../../../../common/src/utils/utils";

module.exports = buildModule("UpdateMerkleRoot", (m) => {

  const registryAddress = "0xBabF700EdE592Aa69e14B5BAE1859ee4164C3323";

  const deployedRocketInstance = m.contractAt("Registry", registryAddress);
  console.log("Deployed registry instance", deployedRocketInstance);
  const merkleRoot = formatRoot(getCSCAModulusMerkleTree().root);
  console.log("Merkle root", merkleRoot);
  m.call(deployedRocketInstance, "update", [merkleRoot]);
  return { deployedRocketInstance };
});