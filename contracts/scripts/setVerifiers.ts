import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { RegisterVerifierId, DscVerifierId } from "../../common/src/constants/constants";

dotenv.config();

const deployedAddresses = JSON.parse(fs.readFileSync(path.join(__dirname, "../ignition/deployments/chain-42220/deployed_addresses.json"), "utf-8"));
const contractAbiPath = path.join(__dirname, "../ignition/deployments/chain-11155111/artifacts");

function getContractAddressByPartialName(partialName: string): string | unknown {
    for (const [key, value] of Object.entries(deployedAddresses)) {
        if (key.includes(partialName)) {
            return value;
        }
    }
    return undefined;
}

async function main() {

    const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL as string);
    const wallet = new ethers.Wallet(process.env.CELO_KEY as string, provider);
    const identityVerificationHubAbiFile = fs.readFileSync(path.join(__dirname, "../ignition/deployments/chain-42220/artifacts/DeployHub#IdentityVerificationHubImplV1.json"), "utf-8");
    const identityVerificationHubAbi = JSON.parse(identityVerificationHubAbiFile).abi;
    const identityVerificationHub = new ethers.Contract(deployedAddresses["DeployHub#IdentityVerificationHub"], identityVerificationHubAbi, wallet);

    const registerVerifierKeys = Object.keys(RegisterVerifierId).filter(key => isNaN(Number(key)));
    for (const key of registerVerifierKeys) {
        const verifierName = `Verifier_${key}`;
        const verifierAddress = getContractAddressByPartialName(verifierName);
        if (!verifierAddress) {
            console.log(`Skipping ${verifierName} because no deployed address was found.`);
            continue;
        }
        console.log(`Updating for ${verifierName}`);
        const verifierId = RegisterVerifierId[key as keyof typeof RegisterVerifierId];

        const tx = await identityVerificationHub.updateRegisterCircuitVerifier(
            verifierId,
            verifierAddress
        );
        const receipt = await tx.wait();
        console.log(`${verifierName} is updated wit this tx: ${receipt.hash}`)
    }

    const dscKeys = Object.keys(DscVerifierId).filter(key => isNaN(Number(key)));
    for (const key of dscKeys) {
        const verifierName = `Verifier_${key}`;
        const verifierAddress = getContractAddressByPartialName(verifierName);
        if (!verifierAddress) {
            console.log(`Skipping ${verifierName} because no deployed address was found.`);
            continue;
        }
        const verifierId = DscVerifierId[key as keyof typeof DscVerifierId];

        const tx = await identityVerificationHub.updateDscVerifier(
            verifierId,
            verifierAddress
        );
        const receipt = await tx.wait();
        console.log(`${verifierName} is updated wit this tx: ${receipt.hash}`);
    }

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });