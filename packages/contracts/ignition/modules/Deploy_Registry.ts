import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { formatRoot } from "../../../common/src/utils/utils";
import { generateCircuitInputsRegister } from "../../../common/src/utils/generateInputs";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../../common/src/utils/mockPassportData";
export default buildModule("Deploy_Registry", (m) => {

    let secret: string = BigInt(0).toString();
    let attestation_id: string = BigInt(0).toString();
    let passportData = mockPassportData_sha256WithRSAEncryption_65537;

    let inputs: any = generateCircuitInputsRegister(
        secret, attestation_id, passportData
    );
    let merkle_root = inputs.merkle_root.toString();
    const root = formatRoot(merkle_root);
    const registry = m.contract("Registry", [root]);

    return { registry };
});

