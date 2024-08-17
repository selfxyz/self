import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { formatRoot } from "../../../common/src/utils/utils";
import { generateCircuitInputsRegister } from "../../../common/src/utils/generateInputs";
import { countryCodes, k_csca, n_csca } from "../../../common/src/constants/constants";
import { getCSCAModulusMerkleTree } from "../../../common/src/utils/csca";

export default buildModule("Deploy_Registry", (m) => {

    const registry = m.contract("Registry", [formatRoot(getCSCAModulusMerkleTree().root)]);
    const formatter = m.contract("Formatter");
    const poseidonT3 = m.contract("PoseidonT3");
    m.call(formatter, "addCountryCodes", [Object.entries(countryCodes)]);

    const register = m.contract("OpenPassportRegister", [registry], { libraries: { PoseidonT3: poseidonT3 } });
    const Verifier_register_sha256WithRSAEncryption_65537 = m.contract("Verifier_register_sha256WithRSAEncryption_65537");
    const Verifier_register_sha1WithRSAEncryption_65537 = m.contract("Verifier_register_sha1WithRSAEncryption_65537");
    const Verifier_dsc_sha256_rsa_4096 = m.contract("Verifier_dsc_sha256_rsa_4096");

    m.call(register, "addSignatureAlgorithm", [1, Verifier_register_sha256WithRSAEncryption_65537], { id: "a" });
    m.call(register, "addSignatureAlgorithm", [3, Verifier_register_sha1WithRSAEncryption_65537], { id: "b" });
    m.call(register, "addCSCAVerifier", [1, Verifier_dsc_sha256_rsa_4096], { id: "c" });

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

