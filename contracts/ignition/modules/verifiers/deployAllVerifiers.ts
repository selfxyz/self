import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { RegisterVerifierId, RegisterVerifierId_ID_CARD, DscVerifierId } from "@selfxyz/common";
import * as fs from "fs";
import * as path from "path";

const deployVerifiers = {
  vcAndDiscloseVerifier: false,
  vcAndDiscloseIdVerifier: false,
  registerIdVerifier: false,
  registerVerifier: false,
  dscVerifier: true,
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

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default buildModule("DeployAllVerifiers", (m) => {
  let successfulRegisterIdDeployments = 0;
  let successfulRegisterDeployments = 0;
  let successfulDscDeployments = 0;

  const deployedContracts: Record<string, any> = {};
  let lastDeployedContract: any = null;

  // Deploy VC and Disclose verifier
  if (deployVerifiers.vcAndDiscloseVerifier) {
    console.log("Deploying VC and Disclose verifier...");
    deployedContracts.vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");
    lastDeployedContract = deployedContracts.vcAndDiscloseVerifier;
  }

  // Deploy VC and Disclose ID verifier
  if (deployVerifiers.vcAndDiscloseIdVerifier) {
    console.log("Deploying VC and Disclose ID verifier...");
    const deployOptions = lastDeployedContract ? { after: [lastDeployedContract] } : {};
    deployedContracts.vcAndDiscloseIdVerifier = m.contract("Verifier_vc_and_disclose_id", [], deployOptions);
    lastDeployedContract = deployedContracts.vcAndDiscloseIdVerifier;
  }

  // Deploy Register ID verifiers (for ID cards) using RegisterVerifierId_ID_CARD enum
  const registerIdCircuits = getEnumKeys(RegisterVerifierId_ID_CARD);
  if (deployVerifiers.registerIdVerifier) {
    console.log("Deploying Register ID verifiers with sequential dependencies...");
    registerIdCircuits.forEach((circuitName, index) => {
      const contractName = `Verifier_${circuitName}`;
      if (contractExists(contractName)) {
        console.log(`  - Deploying ${contractName} (${index + 1}/${registerIdCircuits.length})`);

        // Create dependency on the last deployed contract to ensure sequential deployment
        const deployOptions = lastDeployedContract ? { after: [lastDeployedContract] } : {};
        deployedContracts[circuitName] = m.contract(contractName, [], deployOptions);
        lastDeployedContract = deployedContracts[circuitName];
        successfulRegisterIdDeployments++;
      } else {
        console.warn(`  - Warning: Contract ${contractName} not found, skipping...`);
      }
    });
  }

  // Deploy Register verifiers using RegisterVerifierId enum
  const registerCircuits = getEnumKeys(RegisterVerifierId);
  if (deployVerifiers.registerVerifier) {
    console.log("Deploying Register verifiers with sequential dependencies...");
    registerCircuits.forEach((circuitName, index) => {
      const contractName = `Verifier_${circuitName}`;
      if (contractExists(contractName)) {
        console.log(`  - Deploying ${contractName} (${index + 1}/${registerCircuits.length})`);

        // Create dependency on the last deployed contract to ensure sequential deployment
        const deployOptions = lastDeployedContract ? { after: [lastDeployedContract] } : {};
        deployedContracts[circuitName] = m.contract(contractName, [], deployOptions);
        lastDeployedContract = deployedContracts[circuitName];
        successfulRegisterDeployments++;
      } else {
        console.warn(`  - Warning: Contract ${contractName} not found, skipping...`);
      }
    });
  }

  // Deploy DSC verifiers using DscVerifierId enum
  const dscCircuits = getEnumKeys(DscVerifierId);
  if (deployVerifiers.dscVerifier) {
    console.log("Deploying DSC verifiers with sequential dependencies...");
    dscCircuits.forEach((circuitName, index) => {
      const contractName = `Verifier_${circuitName}`;
      if (contractExists(contractName)) {
        console.log(`  - Deploying ${contractName} (${index + 1}/${dscCircuits.length})`);

        // Create dependency on the last deployed contract to ensure sequential deployment
        const deployOptions = lastDeployedContract ? { after: [lastDeployedContract] } : {};
        deployedContracts[circuitName] = m.contract(contractName, [], deployOptions);
        lastDeployedContract = deployedContracts[circuitName];
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
    `  - Total successful deployments: ${(deployVerifiers.vcAndDiscloseVerifier ? 1 : 0) + (deployVerifiers.vcAndDiscloseIdVerifier ? 1 : 0) + successfulRegisterIdDeployments + successfulRegisterDeployments + successfulDscDeployments}`,
  );
  console.log(`  - Deployments will execute sequentially to prevent nonce conflicts`);

  return deployedContracts;
});
