import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import path from "path";

module.exports = buildModule("UpdateVerifyAllAddresses", (m) => {
  //   const networkName = hre.network.config.chainId;

  //   const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${networkName}/deployed_addresses.json`);
  //   const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

  // Get the addresses from the deployed_addresses.json file
  //   const verifyAllAddress = deployedAddresses["DeployVerifyAllModule#VerifyAll"];
  //   const hubAddress = deployedAddresses["DeployHubModule#IdentityVerificationHub"];
  //   const registryAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];
  const verifyAllAddress = "0x03237E7b4c2b1AdEBdBC33d91478Eaef05D0fF85";
  const hubAddress = "0x3e2487a250e2A7b56c7ef5307Fb591Cc8C83623D";
  const registryAddress = "0xD961B67B35739cCF16326B087C9aD2c0095cCc4E";

  // Get the deployed VerifyAll contract instance
  const deployedVerifyAllInstance = m.contractAt("VerifyAll", verifyAllAddress);
  console.log("Deployed VerifyAll instance", deployedVerifyAllInstance);

  // Call setHub and setRegistry functions
  m.call(deployedVerifyAllInstance, "setHub", [hubAddress]);
  m.call(deployedVerifyAllInstance, "setRegistry", [registryAddress]);

  return { deployedVerifyAllInstance };
});
