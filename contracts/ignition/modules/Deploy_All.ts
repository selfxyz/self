import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { formatRoot } from "../../../common/src/utils/utils";
import { generateCircuitInputsRegister } from "../../../common/src/utils/generateInputs";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../../common/src/utils/mockPassportData";
import { getCSCAInputs, getCSCAModulusProof, getCSCAModulusMerkleTree } from "../../../common/src/utils/csca";
export default buildModule("Deploy_Registry", (m) => {


    let root = getCSCAModulusMerkleTree(121, 34).root;
    const root_formatted = formatRoot(root);

    const registry = m.contract("Registry", [root_formatted]);
    const formatter = m.contract("Formatter");
    const poseidonT3 = m.contract("PoseidonT3");
    const verifier_dsc = m.contract("Verifier_dsc_4096");
    const register = m.contract("ProofOfPassportRegister", [registry, verifier_dsc], { libraries: { PoseidonT3: poseidonT3 } });
    const verifier_register = m.contract("Verifier_register_sha256WithRSAEncryption_65537");

    m.call(register, "addSignatureAlgorithm", [1, verifier_register]);
    const verifier_disclose = m.contract("Verifier_disclose");
    const sbt = m.contract("SBT", [verifier_disclose, formatter, register]);

    return { registry, register, verifier_register, sbt };
});

