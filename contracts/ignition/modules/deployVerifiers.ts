import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
    DEPLOYED_CIRCUITS_REGISTER,
    DEPLOYED_CIRCUITS_DSC
} from "../../../common/src/constants/constants";

export default buildModule("DeployVerifiers", (m) => {
    const useAllVerifiers = process.env.USE_ALL_VERIFIERS === 'true';
    const deployedContracts: Record<string, any> = {};

    deployedContracts.vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");

    if (useAllVerifiers) {
        DEPLOYED_CIRCUITS_REGISTER.forEach(circuit => {
            const contractName = `Verifier_${circuit}`;
            deployedContracts[circuit] = m.contract(contractName);
        });

        DEPLOYED_CIRCUITS_DSC.forEach(circuit => {
            const contractName = `Verifier_${circuit}`;
            deployedContracts[circuit] = m.contract(contractName);
        });
    } else {
        deployedContracts["register_sha1_sha256_sha256_rsa_65537_4096"] = m.contract("Verifier_register_sha1_sha256_sha256_rsa_65537_4096");
        deployedContracts["sha256_sha256_sha256_ecdsa_brainpoolP256r1"] = m.contract("Verifier_register_sha256_sha256_sha256_ecdsa_brainpoolP256r1");
        deployedContracts["register_sha256_sha256_sha256_rsa_65537_4096"] = m.contract("Verifier_register_sha256_sha256_sha256_rsa_65537_4096");
        deployedContracts["dsc_sha256_rsa_65537_4096"] = m.contract("Verifier_dsc_sha256_rsa_65537_4096");
    }

    return deployedContracts;
});