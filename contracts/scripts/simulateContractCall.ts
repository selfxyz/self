import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// Environment configuration
const NETWORK = process.env.NETWORK || "staging"; // Default to staging
const RPC_URL_KEY = NETWORK === "celo" ? "CELO_RPC_URL" : "CELO_ALFAJORES_RPC_URL";
const PRIVATE_KEY = process.env.CELO_KEY;

// Contract details
const CONTRACT_ADDRESS = "0xb32424e64810Ffa264155419C8D898B838715E47"; // IdentityVerificationHub
const CALLDATA = "0x8846ec42000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000002eae2ddf01b8df37e928f69b7b1f494e76cafb841dbd49bab4dae89f6b4e13562f30ea7f6e892f21d2fcaf88460de231ebbef7f03bde84c762ef30599c91fc5114e29224c8ae499b850cca72b708dff56677fd2fc7f2e9b8ea524fbcce37a1aa2b85a0de02adc68aaab3d6ac8e4a63015e92b77b529967d73704b28efd982fc52a7c06dda8ccf2b52d72c17e2bf3f3c5fd06faf16ee280ab81faa4b8489b11ec02460243a3f0866ca3096d61810233228d30805883f2298c8ccdd966f4f943a31c309c694ec54aa7d3843954400f08513cf431d4f6de5675c8e2614b9fce613d1578501de606a5681438a33d6dbc99c78e4a8c6b765252840a096dfafde078b90cf2dcaf102606c04fe690683bd65d5e48f4d90a5f6c0b6d3e30d7ec858df5501befafb1dc16857d64b6b3d7f13a7481c857bc61ffb6920d7fa59b0f05ba373f2cda39fd438bdca0cf087b4573eedf988f25d7faf360ba3ff14ca2d6146e546a";

// Debug logs for environment variables (redacted for security)
console.log("Network:", NETWORK);
console.log(`${RPC_URL_KEY} configured:`, !!process.env[RPC_URL_KEY]);
console.log("CELO_KEY configured:", !!PRIVATE_KEY);

async function main() {
  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env[RPC_URL_KEY] as string);
    console.log("Provider created");

    const wallet = new ethers.Wallet(PRIVATE_KEY as string, provider);
    console.log("Wallet created");
    console.log("Wallet address:", wallet.address);

    // Get current balance
    const balance = await provider.getBalance(wallet.address);
    console.log("Wallet balance:", ethers.formatEther(balance), "ETH");

    // Parse the calldata to understand what function is being called
    const functionSelector = CALLDATA.slice(0, 10);
    console.log("Function selector:", functionSelector);

    // Try to simulate the call first (read-only)
    console.log("Simulating call...");
    try {
      const result = await provider.call({
        to: CONTRACT_ADDRESS,
        data: CALLDATA,
        from: wallet.address,
      });
      console.log("Call simulation successful!");
      console.log("Return data:", result);

      // Try to decode the return data if it's not empty
      if (result !== "0x") {
        console.log("Return data length:", (result.length - 2) / 2, "bytes");
      }
    } catch (error: any) {
      console.log("Call simulation failed:");
      console.log("Error:", error.reason || error.message);

      if (error.data) {
        console.log("Error data:", error.data);
      }

      // Don't proceed with actual transaction if simulation fails
      console.log("Aborting transaction due to simulation failure.");
      return;
    }

    // Estimate gas for the transaction
    console.log("Estimating gas...");
    const gasEstimate = await provider.estimateGas({
      to: CONTRACT_ADDRESS,
      data: CALLDATA,
      from: wallet.address,
    });
    console.log("Estimated gas:", gasEstimate.toString());

    // Get current gas price
    const gasPrice = await provider.getFeeData();
    console.log("Current gas price:", gasPrice.gasPrice?.toString());

    // Calculate transaction cost
    const txCost = gasEstimate * (gasPrice.gasPrice || BigInt(0));
    console.log("Estimated transaction cost:", ethers.formatEther(txCost), "ETH");

    console.log("\n=== SIMULATION COMPLETE ===");
    console.log("The transaction appears to be valid and would succeed.");
    console.log("To actually execute the transaction, use the callContractWithCalldata.ts script.");

  } catch (error: any) {
    console.error("Error occurred:", error);

    // Try to get more detailed error information
    if (error.code === "CALL_EXCEPTION") {
      console.log("Call exception details:");
      console.log("Reason:", error.reason);
      console.log("Method:", error.method);
      console.log("Data:", error.data);
    }

    if (error.transaction) {
      console.log("Transaction details:", error.transaction);
    }
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
