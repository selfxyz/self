import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Deploy_Poseidon", (m) => {
    const poseidonT3 = m.contract("PoseidonT3");

    return { poseidonT3 };
});

