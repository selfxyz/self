//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IGenericVerifier, IRSAProveVerifier, IECDSAProveVerifier, IDscVerifier} from "../interfaces/IGenericVerifier.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GenericVerifier is IGenericVerifier, Ownable {

    mapping (uint256 => address) public signatureTypeIdToVerifiers;

    constructor () Ownable(msg.sender) {}

    function verifyWithProveVerifier(
        uint256 signatureTypeId,
        ProveCircuitProof memory proof
    ) public view returns (bool) {
        bool result;
        if (proof.signatureType == SignatureType.RSA) {
            result = IRSAProveVerifier(signatureTypeIdToVerifiers[signatureTypeId])
                .verifyProof(
                    proof.a,
                    proof.b,
                    proof.c,
                    proof.pubSignalsRSA
                );
        } else if (proof.signatureType == SignatureType.ECDSA) {
            result = IECDSAProveVerifier(signatureTypeIdToVerifiers[signatureTypeId])
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
        uint256 signatureTypeId,
        DscCircuitProof memory proof
    ) public view returns  (bool) {
        bool result = IDscVerifier(signatureTypeIdToVerifiers[signatureTypeId])
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
        VerificationType vType,
        uint256 signatureTypeId,
        address verifierAddress
    ) external onlyOwner {
        if (verifierAddress == address(0)) {
            revert ZERO_ADDRESS();
        }
        if (vType == VerificationType.Prove) {
            signatureTypeIdToVerifiers[signatureTypeId] = verifierAddress;
        }
        if (vType == VerificationType.Dsc) {
            signatureTypeIdToVerifiers[signatureTypeId] = verifierAddress;
        }
    }

}