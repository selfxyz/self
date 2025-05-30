import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const deployedAddresses = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../ignition/deployments/chain-42220/deployed_addresses.json"), "utf-8"),
);
const contractAbiPath = path.join(__dirname, "../ignition/deployments/chain-11155111/artifacts");

const serializedDscTreePath = path.join(__dirname, "../../registry/outputs/serialized_dsc_tree.json");
const serialized_dsc_tree = JSON.parse(JSON.parse(fs.readFileSync(serializedDscTreePath, "utf-8")));

function getContractAddressByPartialName(partialName: string): string | unknown {
  for (const [key, value] of Object.entries(deployedAddresses)) {
    if (key.includes(partialName)) {
      return value;
    }
  }
  return undefined;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL as string);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
  const registryAbiFile = fs.readFileSync(
    path.join(
      __dirname,
      "../ignition/deployments/chain-11155111/artifacts/DeployRegistryModule#IdentityRegistryImplV1.json",
    ),
    "utf-8",
  );
  const registryAbi = JSON.parse(registryAbiFile).abi;
  const registry = new ethers.Contract("0x66916bc86F761a11587B99c474dB9051f8262478", registryAbi, wallet);

  console.log("serialized dsc tree: ", serialized_dsc_tree[0]);
  console.log("lenght: ", serialized_dsc_tree[0].length);
  for (let i = 395; i < serialized_dsc_tree[0].length; i++) {
    const tx = await registry.devAddDscKeyCommitment(serialized_dsc_tree[0][i]);
    const receipt = await tx.wait();
    console.log(`${i} th tx hash: `, receipt.hash);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
