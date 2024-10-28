import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Deploy_Open_Passport_Verifier", (m) => {
    const genericVerifier = m.contract("GenericVerifier");
    const openPassportVerifier = m.contract("OpenPassportVerifier", [genericVerifier]);

    return { 
        genericVerifier,
        openPassportVerifier 
    };
});

