import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { formatRoot } from "../../../common/src/utils/utils";
import { generateCircuitInputsRegister } from "../../../common/src/utils/generateInputs";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../../common/src/utils/mockPassportData";
export default buildModule("Deploy_Registry", (m) => {

    let secret: string = BigInt(0).toString();
    let attestation_id: string = BigInt(0).toString();
    let passportData = mockPassportData_sha256WithRSAEncryption_65537;

    let inputs: any = generateCircuitInputsRegister(
        secret, attestation_id, passportData, { developmentMode: true }
    );
    let merkle_root = inputs.merkle_root.toString();
    const root = formatRoot(merkle_root);

    const registry = m.contract("Registry", [root]);
    const formatter = m.contract("Formatter");
    const poseidonT3 = m.contract("PoseidonT3");

    const register = m.contract("ProofOfPassportRegister", [registry], { libraries: { PoseidonT3: poseidonT3 } });
    const verifier_register = m.contract("Verifier_register_sha256WithRSAEncryption_65537");

    m.call(register, "addSignatureAlgorithm", [1, verifier_register]);
    const verifier_disclose = m.contract("Verifier_disclose");
    const sbt = m.contract("SBT", [verifier_disclose, formatter, register]);

    return { registry, register, verifier_register, sbt };
});

