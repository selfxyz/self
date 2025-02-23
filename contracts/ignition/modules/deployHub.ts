import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts, ethers } from "hardhat";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { RegisterVerifierId, DscVerifierId, DEPLOYED_CIRCUITS_REGISTER, DEPLOYED_CIRCUITS_DSC } from "../../../common/src/constants/constants";

function getHubInitializeData() {
    const hubArtifact = artifacts.readArtifactSync("IdentityVerificationHubImplV1");
    return new ethers.Interface(hubArtifact.abi);
}

function getVerifierAddresses(deployedAddresses: any, circuits: string[]) {
    return circuits.map(circuit => deployedAddresses[`DeployVerifiers#Verifier_${circuit}`]);
}

export default buildModule("DeployHub", (m) => {
    const networkName = hre.network.config.chainId;
    const deployedAddressesPath = path.join(__dirname, `../deployments/chain-${networkName}/deployed_addresses.json`);
    const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

    // 環境変数からverifierの選択を読み込む
    const useAllVerifiers = process.env.USE_ALL_VERIFIERS === 'true';
    
    const registryAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];
    const vcAndDiscloseVerifierAddress = deployedAddresses["DeployVerifiers#Verifier_vc_and_disclose"];

    let registerVerifierIds: string[];
    let registerVerifierAddresses: string[];
    let dscVerifierIds: string[];
    let dscVerifierAddresses: string[];

    if (useAllVerifiers) {
        // 全てのverifierを使用
        registerVerifierIds = DEPLOYED_CIRCUITS_REGISTER;
        registerVerifierAddresses = getVerifierAddresses(deployedAddresses, DEPLOYED_CIRCUITS_REGISTER);
        dscVerifierIds = DEPLOYED_CIRCUITS_DSC;
        dscVerifierAddresses = getVerifierAddresses(deployedAddresses, DEPLOYED_CIRCUITS_DSC);
    } else {
        // デフォルトの3つのregisterVerifierと1つのdscVerifierを使用
        registerVerifierIds = [
            RegisterVerifierId.register_sha1_sha256_sha256_rsa_65537_4096,
            RegisterVerifierId.register_sha256_sha256_sha256_ecdsa_brainpoolP256r1,
            RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096
        ];
        registerVerifierAddresses = [
            deployedAddresses["DeployVerifiers#Verifier_register_sha1_sha256_sha256_rsa_65537_4096"],
            deployedAddresses["DeployVerifiers#Verifier_register_sha256_sha256_sha256_ecdsa_brainpoolP256r1"],
            deployedAddresses["DeployVerifiers#Verifier_register_sha256_sha256_sha256_rsa_65537_4096"]
        ];
        dscVerifierIds = [DscVerifierId.dsc_sha256_rsa_65537_4096];
        dscVerifierAddresses = [deployedAddresses["DeployVerifiers#Verifier_dsc_sha256_rsa_65537_4096"]];
    }

    const identityVerificationHubImpl = m.contract("IdentityVerificationHubImplV1");

    const hubInterface = getHubInitializeData();
    const initializeData = hubInterface.encodeFunctionData("initialize", [
        registryAddress,
        vcAndDiscloseVerifierAddress,
        registerVerifierIds,
        registerVerifierAddresses,
        dscVerifierIds,
        dscVerifierAddresses
    ]);

    const hub = m.contract("IdentityVerificationHub", [
        identityVerificationHubImpl,
        initializeData
    ]);

    return {
        hub,
        identityVerificationHubImpl,
    };
});