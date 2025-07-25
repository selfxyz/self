import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { getContractAbi, getDeployedAddresses, getSavedRepo, getContractAddress, log } from "./constants";

dotenv.config();

// Configuration for which OFAC roots to update
const updateOfacRoots = {
  passport: {
    passportNo: true,
    nameAndDob: true,
    nameAndYob: true,
  },
  idCard: {
    nameAndDob: true,
    nameAndYob: true,
  },
};

const NETWORK = process.env.NETWORK;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!NETWORK || !RPC_URL || !PRIVATE_KEY) {
  throw new Error("One of the following parameters is null: NETWORK, RPC_URL, PRIVATE_KEY");
}

const repoName = getSavedRepo(NETWORK);
const deployedAddresses = getDeployedAddresses(repoName);

log.info(`Network: ${NETWORK}, Repo: ${repoName}`);

try {
  const registryABI = getContractAbi(repoName, "DeployRegistryModule#IdentityRegistryImplV1");
  const registryIdCardABI = getContractAbi(repoName, "DeployIdCardRegistryModule#IdentityRegistryIdCardImplV1");

  async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL as string);
    const wallet = new ethers.Wallet(PRIVATE_KEY as string, provider);
    log.info(`Wallet address: ${wallet.address}`);

    const registryAddress = getContractAddress("DeployRegistryModule#IdentityRegistry", deployedAddresses);
    const registryIdCardAddress = getContractAddress("DeployIdCardRegistryModule#IdentityRegistry", deployedAddresses);

    if (!registryAddress || !registryIdCardAddress) {
      throw new Error("❌ Registry addresses not found in deployed_addresses.json");
    }

    const deployedRegistryInstance = new ethers.Contract(registryAddress, registryABI, wallet);
    const deployedRegistryIdCardInstance = new ethers.Contract(registryIdCardAddress, registryIdCardABI, wallet);

    log.success("Created registry contract instances");

    const passportNo_smt_root = "17359956125106148146828355805271472653597249114301196742546733402427978706344";
    const nameAndDob_smt_root = "7420120618403967585712321281997181302561301414016003514649937965499789236588";
    const nameAndYob_smt_root = "16836358042995742879630198413873414945978677264752036026400967422611478610995";
    const nameAndDob_id_smt_root = "20550865940766091336114076617084411967227963708544788410483208672684333597871";
    const nameAndYob_id_smt_root = "20607501071671444315195585339157145490348308593668944037177822930025980459166";

    let totalUpdates = 0;
    let successfulUpdates = 0;

    // Update passport registry roots based on config
    log.step("Updating OFAC roots for passport registry...");
    if (updateOfacRoots.passport.passportNo) {
      try {
        totalUpdates++;
        const tx = await deployedRegistryInstance.updatePassportNoOfacRoot(passportNo_smt_root);
        const receipt = await tx.wait();
        log.success(`PassportNo OFAC root updated (tx: ${receipt.hash})`);
        successfulUpdates++;
      } catch (error) {
        log.error(`Failed to update PassportNo OFAC root: ${error}`);
      }
    }
    if (updateOfacRoots.passport.nameAndDob) {
      try {
        totalUpdates++;
        const tx = await deployedRegistryInstance.updateNameAndDobOfacRoot(nameAndDob_smt_root);
        const receipt = await tx.wait();
        log.success(`NameAndDob OFAC root updated (tx: ${receipt.hash})`);
        successfulUpdates++;
      } catch (error) {
        log.error(`Failed to update NameAndDob OFAC root: ${error}`);
      }
    }
    if (updateOfacRoots.passport.nameAndYob) {
      try {
        totalUpdates++;
        const tx = await deployedRegistryInstance.updateNameAndYobOfacRoot(nameAndYob_smt_root);
        const receipt = await tx.wait();
        log.success(`NameAndYob OFAC root updated (tx: ${receipt.hash})`);
        successfulUpdates++;
      } catch (error) {
        log.error(`Failed to update NameAndYob OFAC root: ${error}`);
      }
    }

    // Update ID card registry roots based on config
    log.step("Updating OFAC roots for ID card registry...");
    if (updateOfacRoots.idCard.nameAndDob) {
      try {
        totalUpdates++;
        const tx = await deployedRegistryIdCardInstance.updateNameAndDobOfacRoot(nameAndDob_id_smt_root);
        const receipt = await tx.wait();
        log.success(`ID Card NameAndDob OFAC root updated (tx: ${receipt.hash})`);
        successfulUpdates++;
      } catch (error) {
        log.error(`Failed to update ID Card NameAndDob OFAC root: ${error}`);
      }
    }
    if (updateOfacRoots.idCard.nameAndYob) {
      try {
        totalUpdates++;
        const tx = await deployedRegistryIdCardInstance.updateNameAndYobOfacRoot(nameAndYob_id_smt_root);
        const receipt = await tx.wait();
        log.success(`ID Card NameAndYob OFAC root updated (tx: ${receipt.hash})`);
        successfulUpdates++;
      } catch (error) {
        log.error(`Failed to update ID Card NameAndYob OFAC root: ${error}`);
      }
    }

    log.info(`OFAC root update summary: ${successfulUpdates}/${totalUpdates} successful`);
  }

  main().catch((error) => {
    log.error(`Execution failed: ${error}`);
    if (error.reason) log.error(`Reason: ${error.reason}`);
    process.exitCode = 1;
  });
} catch (error) {
  log.error(`Setup failed: ${error}`);
  process.exitCode = 1;
}
