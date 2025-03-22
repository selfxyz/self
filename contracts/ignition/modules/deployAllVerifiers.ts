import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
    DEPLOYED_CIRCUITS_REGISTER,
    DEPLOYED_CIRCUITS_DSC
} from "../../../common/src/constants/constants";

export default buildModule("DeployAllVerifiers", (m) => {
    const deployedContracts: Record<string, any> = {};

    deployedContracts.vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");
    
    DEPLOYED_CIRCUITS_REGISTER.forEach(circuit => {
        const contractName = `Verifier_${circuit}`;
        deployedContracts[circuit] = m.contract(contractName);
    });

    DEPLOYED_CIRCUITS_DSC.forEach(circuit => {
        const contractName = `Verifier_${circuit}`;
        deployedContracts[circuit] = m.contract(contractName);
    });

    return deployedContracts;
});