//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IVerifiersManager, IProveVerifier, IDscVerifier} from "../interfaces/IVerifiersManager.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract VerifiersManager is IVerifiersManager, Ownable {

    enum VerificationType {
        Prove,
        Dsc
    }

    mapping(uint256 => address) public prove_verifiers;
    mapping(uint256 => address) public dsc_verifiers;

    constructor () {
        transferOwnership(msg.sender);
    }

    function verifyWithProveVerifier(
        uint256 verifier_id,
        RSAProveCircuitProof memory proof
    ) public view returns (bool) {
        bool result = IProveVerifier(prove_verifiers[verifier_id])
            .verifyProof(
                proof.a,
                proof.b,
                proof.c,
                proof.pubSignals
            );
        return result;
    }

    function verifyWithDscVerifier(
        uint256 verifier_id,
        DscCircuitProof memory proof
    ) public view returns  (bool) {
        bool result = IDscVerifier(dsc_verifiers[verifier_id])
            .verifyProof(
                proof.a,
                proof.b,
                proof.c,
                proof.pubSignals
            );
        return result;
    }

    function updateVerifier(
        VerificationType v_type,
        uint256 verifier_id,
        address verifier_address
    ) external onlyOwner {
        if (verifier_address == address(0)) {
            revert ZERO_ADDRESS();
        }
        if (v_type == VerificationType.Prove) {
            prove_verifiers[verifier_id] = verifier_address;
        }
        if (v_type == VerificationType.Dsc) {
            dsc_verifiers[verifier_id] = verifier_address;
        }
    }

}