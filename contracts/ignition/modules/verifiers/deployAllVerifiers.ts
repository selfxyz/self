import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { RegisterVerifierId, DscVerifierId } from "@selfxyz/common/constants/constants";
import * as fs from "fs";
import * as path from "path";

/**
 * Get enum keys (circuit names) excluding numeric values
 */
function getEnumKeys<T extends Record<string, string | number>>(enumObject: T): string[] {
  return Object.keys(enumObject).filter(key => isNaN(Number(key)));
}

/**
 * Check if a contract file exists
 */
function contractExists(contractName: string): boolean {
  const contractsDir = path.join(__dirname, "../../../contracts");
  const possiblePaths = [
    path.join(contractsDir, "verifiers/register", `${contractName}.sol`),
    path.join(contractsDir, "verifiers/dsc", `${contractName}.sol`),
    path.join(contractsDir, "verifiers/disclose", `${contractName}.sol`),
    path.join(contractsDir, "verifiers", `${contractName}.sol`),
  ];

  return possiblePaths.some(filePath => fs.existsSync(filePath));
}

export default buildModule("DeployAllVerifiers", (m) => {
  const deployedContracts: Record<string, any> = {};

  // Deploy VC and Disclose verifier
  console.log("Deploying VC and Disclose verifier...");
  deployedContracts.vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");

  // Deploy Register verifiers using RegisterVerifierId enum
  console.log("Deploying Register verifiers...");
  const registerCircuits = getEnumKeys(RegisterVerifierId);
  let successfulRegisterDeployments = 0;
  registerCircuits.forEach((circuitName) => {
    const contractName = `Verifier_${circuitName}`;
    if (contractExists(contractName)) {
      console.log(`  - Deploying ${contractName}`);
      deployedContracts[circuitName] = m.contract(contractName);
      successfulRegisterDeployments++;
    } else {
      console.warn(`  - Warning: Contract ${contractName} not found, skipping...`);
    }
  });

  // Deploy DSC verifiers using DscVerifierId enum
  console.log("Deploying DSC verifiers...");
  const dscCircuits = getEnumKeys(DscVerifierId);
  let successfulDscDeployments = 0;
  dscCircuits.forEach((circuitName) => {
    const contractName = `Verifier_${circuitName}`;
    if (contractExists(contractName)) {
      console.log(`  - Deploying ${contractName}`);
      deployedContracts[circuitName] = m.contract(contractName);
      successfulDscDeployments++;
    } else {
      console.warn(`  - Warning: Contract ${contractName} not found, skipping...`);
    }
  });

  console.log(`Total verifiers deployment summary:`);
  console.log(`  - VC and Disclose: 1`);
  console.log(`  - Register: ${successfulRegisterDeployments}/${registerCircuits.length} (${registerCircuits.length - successfulRegisterDeployments} skipped)`);
  console.log(`  - DSC: ${successfulDscDeployments}/${dscCircuits.length} (${dscCircuits.length - successfulDscDeployments} skipped)`);
  console.log(`  - Total successful deployments: ${1 + successfulRegisterDeployments + successfulDscDeployments}`);

  return deployedContracts;
});
