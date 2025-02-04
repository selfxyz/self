import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const deployedAddresses = JSON.parse(fs.readFileSync(path.join(__dirname, "../ignition/deployments/chain-11155111/deployed_addresses.json"), "utf-8"));
const contractAbiPath = path.join(__dirname, "../ignition/deployments/chain-11155111/artifacts");

const ProveVerifierList = [
    "Verifier_prove_rsa_65537_sha1",
    "Verifier_prove_rsa_65537_sha256",
    "Verifier_prove_rsapss_65537_sha256",
    "Verifier_prove_ecdsa_secp256r1_sha256",
    "Verifier_prove_ecdsa_secp256r1_sha1",
]

const DscVerifierList = [
    "Verifier_dsc_rsa_65537_sha1_4096",
    "Verifier_dsc_rsa_65537_sha256_4096",
    "Verifier_dsc_rsapss_65537_sha256_4096"
]

function getContractAddressByPartialName(partialName: string): string | unknown {
    for (const [key, value] of Object.entries(deployedAddresses)) {
        if (key.includes(partialName)) {
            return value;
        }
    }
    return undefined;
}

function computeVerifierId(input: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(input));
}

async function main() {

    const verifierIds: {
        proveVerifierIds: { [key: string]: string },
        dscVerifierIds: { [key: string]: string }
    } = {
        proveVerifierIds: {},
        dscVerifierIds: {}
    }

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL as string);
    const wallet = new ethers.Wallet(process.env.PKEY as string, provider);
    const GenericVerifierAbiFile = fs.readFileSync(path.join(__dirname, "../ignition/deployments/chain-11155111/artifacts/Deploy_Open_Passport_Verifier#GenericVerifier.json"), "utf-8");
    const GenericVerifierAbi = JSON.parse(GenericVerifierAbiFile).abi;
    const genericVerifier = new ethers.Contract(getContractAddressByPartialName("GenericVerifier") as string, GenericVerifierAbi, wallet);

    for (let i = 0; i < ProveVerifierList.length; i++) {
        // const proveVerifierAddress = getContractAddressByPartialName(ProveVerifierList[i]) as string;
        const proveVerifierId = computeVerifierId(ProveVerifierList[i]);
        verifierIds.proveVerifierIds[ProveVerifierList[i]] = proveVerifierId;
        // await genericVerifier.updateVerifier(0, proveVerifierId, proveVerifierAddress);
    }
    for (let i = 0; i < DscVerifierList.length; i++) {
        // const dscVerifierAddress = getContractAddressByPartialName(DscVerifierList[i]) as string;
        const dscVerifierId = computeVerifierId(DscVerifierList[i]);
        verifierIds.dscVerifierIds[DscVerifierList[i]] = dscVerifierId;
        // await genericVerifier.updateVerifier(1, dscVerifierId, dscVerifierAddress);
    }
    const outputPath = path.join(__dirname, "verifierIds.json");
    fs.writeFileSync(outputPath, JSON.stringify(verifierIds, null, 2), "utf-8");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });