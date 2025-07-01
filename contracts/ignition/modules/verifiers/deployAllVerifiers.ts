import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { RegisterVerifierId, DscVerifierId } from "@selfxyz/common/constants/constants";
import * as fs from "fs";
import * as path from "path";

const deployVerifiers = {
  vcAndDiscloseVerifier: false,
  vcAndDiscloseIdVerifier: false,
  registerIdVerifier: false,
  registerVerifier: false,
  dscVerifier: false,
};

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
  let successfulRegisterIdDeployments = 0;
  let successfulRegisterDeployments = 0;
  let successfulDscDeployments = 0;

  const deployedContracts: Record<string, any> = {};

  // Deploy VC and Disclose verifier
  if (deployVerifiers.vcAndDiscloseVerifier) {
    console.log("Deploying VC and Disclose verifier...");
    deployedContracts.vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");
  }

  // Deploy VC and Disclose ID verifier
  if (deployVerifiers.vcAndDiscloseIdVerifier) {
    console.log("Deploying VC and Disclose ID verifier...");
    deployedContracts.vcAndDiscloseIdVerifier = m.contract("Verifier_vc_and_disclose_id");
  }

  const registerIdCircuits = ["register_id_sha256_sha256_sha256_rsa_65537_4096"];
  // Deploy Register ID verifiers (for ID cards)
  if (deployVerifiers.registerIdVerifier) {
    console.log("Deploying Register ID verifiers...");
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
  }

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
  const registerCircuits = getEnumKeys(RegisterVerifierId);
  if (deployVerifiers.registerVerifier) {
    console.log("Deploying Register verifiers...");
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
  }

  // Deploy DSC verifiers using DscVerifierId enum
  const dscCircuits = getEnumKeys(DscVerifierId);
  if (deployVerifiers.dscVerifier) {
    console.log("Deploying DSC verifiers...");
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
  }

  console.log(`Total verifiers deployment summary:`);
  console.log(`  - VC and Disclose: ${deployVerifiers.vcAndDiscloseVerifier ? 1 : 0}`);
  console.log(`  - VC and Disclose ID: ${deployVerifiers.vcAndDiscloseIdVerifier ? 1 : 0}`);
  console.log(
    `  - Register ID: ${successfulRegisterIdDeployments}/${registerIdCircuits.length} (${registerIdCircuits.length - successfulRegisterIdDeployments} skipped)`,
  );
  console.log(
    `  - Register: ${successfulRegisterDeployments}/${registerCircuits.length} (${registerCircuits.length - successfulRegisterDeployments} skipped)`,
  );
  console.log(
    `  - DSC: ${successfulDscDeployments}/${dscCircuits.length} (${dscCircuits.length - successfulDscDeployments} skipped)`,
  );
  console.log(
    `  - Total successful deployments: ${2 + successfulRegisterIdDeployments + successfulRegisterDeployments + successfulDscDeployments}`,
  );

  return deployedContracts;
});
