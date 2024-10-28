import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("Deploy_Verifier_prove_rsa_65537_sha256", (m) => {
    const verifier_prove_rsa_65537_sha256 = m.contract("Verifier_prove_rsa_65537_sha256");

    return { verifier_prove_rsa_65537_sha256 };
});

