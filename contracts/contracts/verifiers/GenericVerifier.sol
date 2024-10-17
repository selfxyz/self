//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IGenericVerifier, IRSAProveVerifier, IECDSAProveVerifier, IDscVerifier} from "../interfaces/IGenericVerifier.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GenericVerifier is IGenericVerifier, Ownable {

    // TODO: Key of these mappings are keccak256 hash of parameters in each signature algorithm
    mapping(uint256 => address) public prove_verifiers;
    mapping(uint256 => address) public dsc_verifiers;

    constructor () {
        transferOwnership(msg.sender);
    }

    function verifyWithProveVerifier(
        uint256 verifier_id,
        ProveCircuitProof memory proof
    ) public view returns (bool) {
        bool result;
        if (proof.signatureType == SignatureType.RSA) {
            result = IRSAProveVerifier(prove_verifiers[verifier_id])
                .verifyProof(
                    proof.a,
                    proof.b,
                    proof.c,
                    proof.pubSignalsRSA
                );
        } else if (proof.signatureType == SignatureType.ECDSA) {
            result = IECDSAProveVerifier(prove_verifiers[verifier_id])
                .verifyProof(
                    proof.a,
                    proof.b,
                    proof.c,
                    proof.pubSignalsECDSA
                );
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
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

    // TODO: add batch update function
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