import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("Deploy_Verifier_dsc_rsa_65537_sha256_4096", (m) => {
    const verifier_dsc_rsa_65537_sha256_4096 = m.contract("Verifier_dsc_rsa_65537_sha256_4096");

    return { verifier_dsc_rsa_65537_sha256_4096 };
});

