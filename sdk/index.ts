//import { ProofOfPassportWeb2Verifier } from './ProofOfPassportWeb2Verifier';
//import { ProofOfPassportWeb2Inputs } from './ProofOfPassportWeb2Verifier';
//import { ProofOfPassportWeb3Verifier } from './ProofOfPassportWeb3Verifier';
import { verifyProofs } from './ProofOfPassportRegister';
import { Proof } from './ProofOfPassportRegister';
import { check_merkle_root } from './ProofOfPassportRegister';
import { getNullifier, getDSCModulus, getSIV } from './ProofOfPassportRegister';

export {
    //ProofOfPassportWeb2Verifier,
    //ProofOfPassportWeb3Verifier,
    //ProofOfPassportWeb2Inputs,
    verifyProofs,
    Proof,
    check_merkle_root,
    getNullifier,
    getDSCModulus,
    getSIV
};