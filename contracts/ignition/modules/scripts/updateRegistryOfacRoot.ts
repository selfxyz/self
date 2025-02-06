import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { getCscaTreeRoot } from "../../../../common/src/utils/trees";
import { SMT, ChildNodes } from "@openpassport/zk-kit-smt";
import { poseidon2, poseidon3 } from "poseidon-lite";
import { buildSMT } from "../../../../common/src/utils/trees";

module.exports = buildModule("UpdateRegistryOfacRoot", (m) => {

  const networkName = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${networkName}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

  const registryAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];

  const deployedRegistryInstance = m.contractAt("IdentityRegistryImplV1", registryAddress);
  console.log("Deployed registry instance", deployedRegistryInstance);
  const smt = getSMT();
  console.log("Merkle root", smt.root);
  m.call(deployedRegistryInstance, "updateOfacRoot", [smt.root]);
  return { deployedRegistryInstance };
});

export function getSMT() {
  let name = fs.readFileSync("../common/ofacdata/inputs/names.json", "utf-8");
  let name_list = JSON.parse(name);
  let mockSmt;
  if (fs.existsSync("./test/utils/smt.json")) {
      mockSmt = importSMTFromJsonFile("./test/utils/smt.json") as SMT;
  } else {
      const builtSmt = buildSMT(name_list, "name");
      exportSMTToJsonFile(builtSmt[0], builtSmt[1], builtSmt[2], "./test/utils/smt.json");
      mockSmt = builtSmt[2] as SMT;
  }
  return mockSmt;
}

function exportSMTToJsonFile(count: number, time: number, smt: SMT, outputPath?: string) {
  const serializedSMT = smt.export();
  const data = {
      count: count,
      time: time,
      smt: serializedSMT
  };
  const jsonString = JSON.stringify(data, null, 2);
  const defaultPath = path.join(process.cwd(), 'smt.json');
  const finalPath = outputPath ? path.resolve(process.cwd(), outputPath) : defaultPath;

  fs.writeFileSync(finalPath, jsonString, 'utf8');
}

function importSMTFromJsonFile(filePath?: string): SMT | null {
  try {
      const jsonString = fs.readFileSync(path.resolve(process.cwd(), filePath as string), 'utf8');
        
      const data = JSON.parse(jsonString);
        
      const hash2 = (childNodes: ChildNodes) => (childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes));
      const smt = new SMT(hash2, true);
      smt.import(data.smt);
        
      return smt;
  } catch (error) {
      console.error('Failed to import SMT from JSON file:', error);
      return null;
  }
}