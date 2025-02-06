import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DeployVerifiers", (m) => {
    const vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");
    
    const registerVerifier = m.contract("Verifier_register_sha256_sha256_sha256_rsa_65537_4096");

    const dscVerifier = m.contract("Verifier_dsc_sha256_rsa_65537_4096");

    return {
        vcAndDiscloseVerifier,
        registerVerifier,
        dscVerifier
    };
});