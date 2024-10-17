//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IVerifiersManager, IProveVerifier, IDscVerifier} from "../interfaces/IVerifiersManager.sol";

contract VerifiersManagerMock is IVerifiersManager {

    constructor() {}

    function verifyWithProveVerifier(
        uint256 verifier_id, 
        RSAProveCircuitProof memory proof
    ) public view returns (bool) {
        if (verifier_id == 1) {
            return false;
        }
        return true;
    }

    function verifyWithDscVerifier(
        uint256 verifier_id, 
        DscCircuitProof memory proof
    ) public view returns (bool) {
        if (verifier_id == 1) {
            return false;
        }
        return true;
    }

}