import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("Deploy_Verifier_dsc_4096", (m) => {

    const verifier_register = m.contract("Verifier_dsc_4096");

    return { verifier_register };
});

