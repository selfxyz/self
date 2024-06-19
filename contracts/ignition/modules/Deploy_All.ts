import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { formatRoot } from "../../../common/src/utils/utils";
import { generateCircuitInputsRegister } from "../../../common/src/utils/generateInputs";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../../common/src/utils/mockPassportData";
import { countryCodes } from "../../../common/src/constants/constants";

export default buildModule("Deploy_Registry", (m) => {
    // mock inputs just to get the pubkey tree root
    let inputs: any = generateCircuitInputsRegister(
        BigInt(0).toString(),
        BigInt(0).toString(),
        mockPassportData_sha256WithRSAEncryption_65537,
    );
    const root = formatRoot(inputs.merkle_root.toString());

    const registry = m.contract("Registry", [root]);
    const formatter = m.contract("Formatter");
    const poseidonT3 = m.contract("PoseidonT3");
    m.call(formatter, "addCountryCodes", [Object.entries(countryCodes)]);

    const register = m.contract("ProofOfPassportRegister", [registry], { libraries: { PoseidonT3: poseidonT3 } });
    const Verifier_register_sha256WithRSAEncryption_65537 = m.contract("Verifier_register_sha256WithRSAEncryption_65537");
    const Verifier_register_sha1WithRSAEncryption_65537 = m.contract("Verifier_register_sha1WithRSAEncryption_65537");

    m.call(register, "addSignatureAlgorithm", [1, Verifier_register_sha256WithRSAEncryption_65537], {id: "a"});
    m.call(register, "addSignatureAlgorithm", [3, Verifier_register_sha1WithRSAEncryption_65537],  {id: "b"});
    
    const verifier_disclose = m.contract("Verifier_disclose");
    const sbt = m.contract("SBT", [verifier_disclose, formatter, register]);

    return {
        registry,
        register,
        Verifier_register_sha256WithRSAEncryption_65537,
        Verifier_register_sha1WithRSAEncryption_65537,
        sbt
    };
});

