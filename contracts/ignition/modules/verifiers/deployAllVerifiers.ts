import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { RegisterVerifierId, DscVerifierId } from "../../../../common/src/constants/constants";

/**
 * Get enum keys (circuit names) excluding numeric values
 */
function getEnumKeys<T extends Record<string, string | number>>(enumObject: T): string[] {
  return Object.keys(enumObject).filter(key => isNaN(Number(key)));
}

export default buildModule("DeployAllVerifiers", (m) => {
  const deployedContracts: Record<string, any> = {};

  // Deploy VC and Disclose verifier
  console.log("Deploying VC and Disclose verifier...");
  deployedContracts.vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");

  // Deploy Register verifiers using RegisterVerifierId enum
  console.log("Deploying Register verifiers...");
  const registerCircuits = getEnumKeys(RegisterVerifierId);
  registerCircuits.forEach((circuitName) => {
    const contractName = `Verifier_${circuitName}`;
    console.log(`  - Deploying ${contractName}`);
    deployedContracts[circuitName] = m.contract(contractName);
  });

  // Deploy DSC verifiers using DscVerifierId enum
  console.log("Deploying DSC verifiers...");
  const dscCircuits = getEnumKeys(DscVerifierId);
  dscCircuits.forEach((circuitName) => {
    const contractName = `Verifier_${circuitName}`;
    console.log(`  - Deploying ${contractName}`);
    deployedContracts[circuitName] = m.contract(contractName);
  });

  console.log(`Total verifiers to deploy: ${1 + registerCircuits.length + dscCircuits.length}`);
  console.log(`  - VC and Disclose: 1`);
  console.log(`  - Register: ${registerCircuits.length}`);
  console.log(`  - DSC: ${dscCircuits.length}`);

  return deployedContracts;
});
