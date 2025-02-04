import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Deploy_Verify_register", (m) => {

    const registry = "0x06A37831d423F5a3A77f9Ab052760d3698fce7A8";
    const libposeidonT3 = m.library("PoseidonT3", { id: "PoseidonT3lib" });
    const register = m.contract("OpenPassportRegister", [registry], { libraries: { PoseidonT3: libposeidonT3 } });

    return { register };
});

