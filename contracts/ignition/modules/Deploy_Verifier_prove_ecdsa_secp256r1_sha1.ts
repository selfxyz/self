import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("Deploy_Verifier_prove_ecdsa_secp256r1_sha1", (m) => {
    const verifier_prove_ecdsa_secp256r1_sha1 = m.contract("Verifier_prove_ecdsa_secp256r1_sha1");

    return { verifier_prove_ecdsa_secp256r1_sha1 };
});

