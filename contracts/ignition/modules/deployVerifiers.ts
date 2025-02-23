import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DeployVerifiers", (m) => {
 
    const vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");
    
    const registerVerifier = m.contract("Verifier_register_sha1_sha256_sha256_rsa_65537_4096");
    const registerVerifier2 = m.contract("Verifier_register_sha256_sha256_sha256_ecdsa_brainpoolP256r1");
    const registerVerifier3 = m.contract("Verifier_register_sha256_sha256_sha256_rsa_65537_4096");

    const dscVerifier = m.contract("Verifier_dsc_sha256_rsa_65537_4096");

    return {
        vcAndDiscloseVerifier,
        registerVerifier,
        registerVerifier2,
        registerVerifier3,
        dscVerifier
    };
});