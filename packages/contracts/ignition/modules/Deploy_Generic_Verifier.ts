import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Deploy_Generic_Verifier", (m) => {
    const genericVerifier = m.contract("GenericVerifier");

    return { genericVerifier };
});

