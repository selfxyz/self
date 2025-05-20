/**
 * DSC Key Commitment Deletion Script
 *
 * This script is designed to delete all DSC key commitments from the registry contract.
 *
 * The process works as follows:
 * 1. Reads the serialized DSC tree data from JSON
 * 2. Initializes a LeanIMT (Lean Incremental Merkle Tree) instance with the same data
 * 3. For each commitment in the tree:
 *    a. Generates a Merkle proof (sibling nodes) needed for the deletion
 *    b. Calls the contract's devRemoveDscKeyCommitment method
 *    c. Updates the local tree to maintain consistency with the contract
 *
 * The script ensures the local tree stays in sync with the contract by updating
 * each leaf to zero after successfully removing it from the contract.
 *
 * Requirements:
 * - A properly configured .env file with RPC_URL and PRIVATE_KEY
 * - Access to the serialized DSC tree data in the specified path
 * - Owner permissions on the registry contract
 */

import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
import * as dotenv from "dotenv";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { poseidon2 } from "poseidon-lite";

dotenv.config();

// Read the serialized DSC tree data
const serializedDscTreePath = path.join(__dirname, "../../registry/outputs/serialized_dsc_tree.json");
const serialized_dsc_tree_json = fs.readFileSync(serializedDscTreePath, "utf-8");
const serialized_dsc_tree = JSON.parse(JSON.parse(serialized_dsc_tree_json));

// Create DSC key commitment tree from the serialized data
const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
// Initialize LeanIMT with the hash function
const dscTree = new LeanIMT<bigint>(hashFunction);

// Function to initialize the tree with all commitments
function initializeTree() {
  console.log("Initializing DSC tree...");
  // The first array in serialized_dsc_tree[0] contains the leaf nodes
  for (let i = 0; i < serialized_dsc_tree[0].length; i++) {
    dscTree.insert(BigInt(serialized_dsc_tree[0][i]));
  }
  console.log(`Initialized DSC tree with ${dscTree.size} commitments. Root: ${dscTree.root}`);
}

async function main() {
  try {
    // Set up connection to blockchain
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL as string);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

    // Load the registry contract
    const registryAbiFile = fs.readFileSync(
      path.join(
        __dirname,
        "../ignition/deployments/chain-11155111/artifacts/DeployRegistryModule#IdentityRegistryImplV1.json",
      ),
      "utf-8",
    );
    const registryAbi = JSON.parse(registryAbiFile).abi;
    const registryAddress = "0xD961B67B35739cCF16326B087C9aD2c0095cCc4E"; // Update with your contract address
    const registry = new ethers.Contract(registryAddress, registryAbi, wallet);

    // Initialize our tree with all the DSC key commitments
    initializeTree();

    // Get all commitments to delete
    const commitments = serialized_dsc_tree[0];
    console.log(`Total commitments to delete: ${commitments.length}`);

    // Delete each commitment one by one
    for (let i = 0; i < commitments.length; i++) {
      try {
        const commitment = BigInt(commitments[i]);
        console.log(`Processing commitment ${i + 1}/${commitments.length}: ${commitment.toString()}`);

        // Find the index of the commitment in the tree
        const index = dscTree.indexOf(commitment);
        if (index === -1) {
          console.warn(`Commitment ${commitment.toString()} not found in the tree, skipping...`);
          continue;
        }

        // Generate the proof for the current commitment
        const { siblings } = dscTree.generateProof(index);

        // Convert siblings to string array for contract call
        const siblingNodes = siblings.map((s) => s.toString());

        // Call the contract to remove the commitment
        console.log(`Removing commitment from contract...`);
        const tx = await registry.devRemoveDscKeyCommitment(commitment.toString(), siblingNodes);

        console.log(`Transaction sent. Waiting for confirmation...`);
        const receipt = await tx.wait();
        console.log(`Transaction confirmed! Hash: ${receipt.hash}`);

        // Update the commitment in our local tree to keep it in sync with the contract
        // According to documentation, update takes index and new value
        dscTree.update(index, BigInt(0)); // Update to zero, effectively "removing" it
        console.log(`Removed commitment ${i + 1}. New tree root: ${dscTree.root}`);

        // Small delay to avoid spamming the network
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing commitment ${i + 1}:`, error);
        // Continue with the next commitment
      }
    }

    console.log("All DSC key commitments have been removed.");
  } catch (error) {
    console.error("Error in main function:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
