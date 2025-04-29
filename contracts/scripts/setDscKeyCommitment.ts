import * as dotenv from "dotenv";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// const deployedAddresses = JSON.parse(fs.readFileSync(path.join(__dirname, "../ignition/deployments/chain-42220/deployed_addresses.json"), "utf-8"));
// const contractAbiPath = path.join(__dirname, "../ignition/deployments/chain-11155111/artifacts");

// const serializedDscTreePath = path.join(__dirname, "../../registry/outputs/serialized_dsc_tree.json");
// const serialized_dsc_tree = JSON.parse(JSON.parse(fs.readFileSync(serializedDscTreePath, "utf-8")));

// function getContractAddressByPartialName(partialName: string): string | unknown {
//     for (const [key, value] of Object.entries(deployedAddresses)) {
//         if (key.includes(partialName)) {
//             return value;
//         }
//     }
//     return undefined;
// }

async function main() {

    const provider = new ethers.JsonRpcProvider(process.env.CELO_ALFAJORES_RPC_URL as string);
    const wallet = new ethers.Wallet(process.env.CELO_KEY as string, provider);
    const registryAbiFile = fs.readFileSync(path.join(__dirname, "../ignition/deployments/prod/artifacts/DeployRegistryModule#IdentityRegistryImplV1.json"), "utf-8");
    const registryAbi = JSON.parse(registryAbiFile).abi;
    const registry = new ethers.Contract("0xD961B67B35739cCF16326B087C9aD2c0095cCc4E", registryAbi, wallet);

    // for (let i = 395; i < serialized_dsc_tree[0].length; i++) {
    //     const tx = await registry.devAddDscKeyCommitment(
    //         serialized_dsc_tree[0][i]
    //     );
    //     const receipt = await tx.wait();
    //     console.log(`${i} th tx hash: `, receipt.hash);
    // }

    const tx = await registry.devAddDscKeyCommitment(
        "16571287827766895102287419431053713290825524021968322862145786353072216588074"
    );
    const receipt = await tx.wait();
    console.log("tx hash: ", receipt.hash);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
