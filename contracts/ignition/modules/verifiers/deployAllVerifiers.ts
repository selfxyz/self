import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { RegisterVerifierId, DscVerifierId } from "@selfxyz/common/constants/constants";
import * as fs from "fs";
import * as path from "path";

/**
 * Get enum keys (circuit names) excluding numeric values
 */
function getEnumKeys<T extends Record<string, string | number>>(enumObject: T): string[] {
  return Object.keys(enumObject).filter((key) => isNaN(Number(key)));
}

/**
 * Check if a contract file exists
 */
function contractExists(contractName: string): boolean {
  const contractsDir = path.join(__dirname, "../../../contracts");
  const possiblePaths = [
    path.join(contractsDir, "verifiers/register", `${contractName}.sol`),
    path.join(contractsDir, "verifiers/register_id", `${contractName}.sol`),
    path.join(contractsDir, "verifiers/dsc", `${contractName}.sol`),
    path.join(contractsDir, "verifiers/disclose", `${contractName}.sol`),
    path.join(contractsDir, "verifiers", `${contractName}.sol`),
  ];

  return possiblePaths.some((filePath) => fs.existsSync(filePath));
}

export default buildModule("DeployAllVerifiers", (m) => {
  const deployedContracts: Record<string, any> = {};

  // Deploy VC and Disclose verifier
  console.log("Deploying VC and Disclose verifier...");
  deployedContracts.vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");

  // Deploy VC and Disclose ID verifier
  console.log("Deploying VC and Disclose ID verifier...");
  deployedContracts.vcAndDiscloseIdVerifier = m.contract("Verifier_vc_and_disclose_id");

  // Deploy Register ID verifiers (for ID cards)
  console.log("Deploying Register ID verifiers...");
  const registerIdCircuits = ["register_id_sha256_sha256_sha256_rsa_65537_4096"];
  let successfulRegisterIdDeployments = 0;
  registerIdCircuits.forEach((circuitName) => {
    const contractName = `Verifier_${circuitName}`;
    if (contractExists(contractName)) {
      console.log(`  - Deploying ${contractName}`);
      deployedContracts[circuitName] = m.contract(contractName);
      successfulRegisterIdDeployments++;
    } else {
      console.warn(`  - Warning: Contract ${contractName} not found, skipping...`);
    }
  });

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
  console.log(`  - VC and Disclose ID: 1`);
  console.log(
    `  - Register ID: ${successfulRegisterIdDeployments}/${registerIdCircuits.length} (${registerIdCircuits.length - successfulRegisterIdDeployments} skipped)`,
  );
  console.log(
    `  - Register: ${successfulRegisterDeployments}/${registerCircuits.length} (${registerCircuits.length - successfulRegisterDeployments} skipped)`,
  );
  console.log(
    `  - DSC: ${successfulDscDeployments}/${dscCircuits.length} (${dscCircuits.length - successfulDscDeployments} skipped)`,
  );
  console.log(`  - Total successful deployments: ${2 + successfulRegisterIdDeployments + successfulRegisterDeployments + successfulDscDeployments}`);

  return deployedContracts;
});
