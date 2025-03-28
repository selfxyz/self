import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { RegisterVerifierId, DscVerifierId } from "../../../common/src/constants/constants";
import { artifacts } from "hardhat";

export default buildModule("DeployAllVerifiers", (m) => {
    const vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");
    const registerVerifiers: { [key: string]: any } = {};
    for (const key in RegisterVerifierId) {
        if (isNaN(Number(key))) {
            const contractName = `Verifier_${key}`;
            try {
                artifacts.readArtifactSync(contractName);
                registerVerifiers[key] = m.contract(contractName);
                console.log(`Deploying ${contractName}`);
            } catch (error) {
                console.log(`Skipping ${contractName}: Artifact not found`);
            }
        }
    }
    
    const dscVerifiers: { [key: string]: any } = {};
    for (const key in DscVerifierId) {
        if (isNaN(Number(key))) {
            const contractName = `Verifier_${key}`;
            try {   
                artifacts.readArtifactSync(contractName);
                dscVerifiers[key] = m.contract(contractName);
                console.log(`Deploying ${contractName}`);
            } catch (error) {
                console.log(`Skipping ${contractName}: Artifact not found`);
            }
        }
    }

    return {
        vcAndDiscloseVerifier,
        registerVerifiers,
        dscVerifiers
    };
});