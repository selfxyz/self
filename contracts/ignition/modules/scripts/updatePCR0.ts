import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";
import { ethers } from "ethers";

export default buildModule("UpdatePCR0", (m) => {
  const networkName = hre.network.config.chainId;
  const journalPath = path.join(__dirname, "../../deployments", `chain-${networkName}`, "journal.jsonl");

  // Read and parse the journal file
  const journal = readFileSync(journalPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  // Find the deployment result entry
  const deploymentResult = journal.find(
    (entry) => entry.type === "DEPLOYMENT_EXECUTION_STATE_COMPLETE" && entry.futureId === "DeployPCR0#PCR0Manager",
  );

  if (!deploymentResult?.result?.address) {
    throw new Error("PCR0Manager address not found in journal. Please deploy PCR0Manager first.");
  }

  const pcr0Address = deploymentResult.result.address;
  const pcr0Manager = m.contractAt("PCR0Manager", pcr0Address);
  const pcr0Hash = "002991b83537ca49d9cfcd3375d9148151121470eef8e84cac087d789af9d200bcc6582fb53e0e273aeddc83943c4def";
  if (pcr0Hash.length !== 96) {
    throw new Error(`Invalid PCR0 hash length: expected 96 hex characters, got ${pcr0Hash.length}`);
  }
  const pcr0Bytes = "0x" + pcr0Hash;
  // Create a zero-filled hex string

  // Add the zero PCR0 value
  m.call(pcr0Manager, "addPCR0", [pcr0Bytes]);

  return {};
});
