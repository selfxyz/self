import hre from "hardhat";
import { RegisterVerifierId, DscVerifierId } from "../../../common/src/constants/constants";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const hubAddress = await getDeployedAddress("IdentityVerificationHub") as string;
  const registryAddress = await getDeployedAddress("IdentityRegistry") as string;
  
  const hub = await hre.ethers.getContractAt("IdentityVerificationHubImplV1", hubAddress);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Executing with account: ${deployer.address}`);
  
  try {
    console.log(`Updating registry address to ${registryAddress}`);
    const tx = await hub.updateRegistry(registryAddress);
    await tx.wait();
    console.log("Registry address updated successfully");
  } catch (error) {
    console.log("Error updating registry address:", error);
  }
  
  const registerVerifierKeys = Object.keys(RegisterVerifierId).filter(key => isNaN(Number(key)));
  
  for (const key of registerVerifierKeys) {
    const verifierContractName = `Verifier_${key}`;
    try {
      const verifierAddress = await getDeployedAddress(verifierContractName);
      if (!verifierAddress) {
        console.log(`Skipping ${verifierContractName}: Not deployed`);
        continue;
      }
      
      const verifierId = RegisterVerifierId[key as keyof typeof RegisterVerifierId];
      
      console.log(`Updating RegisterVerifier: ${key} (ID: ${verifierId}) at address ${verifierAddress}`);
      
      const tx = await hub.updateRegisterCircuitVerifier(verifierId, verifierAddress);
      await tx.wait();
      
      console.log(`Successfully updated RegisterVerifier: ${key}`);
    } catch (error) {
      console.log(`Error updating RegisterVerifier ${key}:`, error);
    }
  }
  
  const dscVerifierKeys = Object.keys(DscVerifierId).filter(key => isNaN(Number(key)));
  
  for (const key of dscVerifierKeys) {
    const verifierContractName = `Verifier_${key}`;
    try {
      const verifierAddress = await getDeployedAddress(verifierContractName);
      if (!verifierAddress) {
        console.log(`Skipping ${verifierContractName}: Not deployed`);
        continue;
      }
      
      const verifierId = DscVerifierId[key as keyof typeof DscVerifierId];
      
      console.log(`Updating DscVerifier: ${key} (ID: ${verifierId}) at address ${verifierAddress}`);
      
      const tx = await hub.updateDscVerifier(verifierId, verifierAddress);
      await tx.wait();
      
      console.log(`Successfully updated DscVerifier: ${key}`);
    } catch (error) {
      console.log(`Error updating DscVerifier ${key}:`, error);
    }
  }
  
  try {
    const vcAndDiscloseAddress = await getDeployedAddress("Verifier_vc_and_disclose");
    if (vcAndDiscloseAddress) {
      console.log(`Updating VC and Disclose Verifier at address ${vcAndDiscloseAddress}`);
      const tx = await hub.updateVcAndDiscloseCircuit(vcAndDiscloseAddress);
      await tx.wait();
      console.log("Successfully updated VC and Disclose Verifier");
    } else {
      console.log("Skipping VC and Disclose Verifier: Not deployed");
    }
  } catch (error) {
    console.log("Error updating VC and Disclose Verifier:", error);
  }
  
  try {
    const batchRegisterIds: number[] = [];
    const batchRegisterAddresses: string[] = [];
    
    for (const key of registerVerifierKeys) {
      const verifierAddress = await getDeployedAddress(`Verifier_${key}`);
      if (verifierAddress) {
        const verifierId = RegisterVerifierId[key as keyof typeof RegisterVerifierId];
        batchRegisterIds.push(verifierId);
        batchRegisterAddresses.push(verifierAddress);
      }
    }
    
    if (batchRegisterIds.length > 0) {
      console.log(`Batch updating ${batchRegisterIds.length} register verifiers`);
      const tx = await hub.batchUpdateRegisterCircuitVerifiers(batchRegisterIds, batchRegisterAddresses);
      await tx.wait();
      console.log("Batch update of register verifiers completed");
    }
    
  } catch (error) {
    console.log("Error with batch updates:", error);
  }
  
  console.log("Setup completed!");
}

async function getDeployedAddress(contractName: string): Promise<string | null> {
  try {
    const deploymentsPath = path.join(__dirname, "../deployments.json");
    
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
      return deployments[contractName] || null;
    } else {
      const ignitionDeploymentsPath = path.join(__dirname, "../../ignition/deployments/chain-42220/deployed_addresses.json");
      if (fs.existsSync(ignitionDeploymentsPath)) {
        const ignitionDeployments = JSON.parse(fs.readFileSync(ignitionDeploymentsPath, "utf-8"));
        for (const [key, value] of Object.entries(ignitionDeployments)) {
          if (key.includes(contractName)) {
            return value as string;
          }
        }
      }
    }
    
    console.log(`No deployment found for ${contractName}`);
    return null;
  } catch (error) {
    console.log(`Error getting address for ${contractName}:`, error);
    return null;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
