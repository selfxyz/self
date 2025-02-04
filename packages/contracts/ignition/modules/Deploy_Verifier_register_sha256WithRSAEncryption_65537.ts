import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("Deploy_Registry", (m) => {

    const verifier_register = m.contract("Verifier_register_sha256WithRSAEncryption_65537");

    return { verifier_register };
});

