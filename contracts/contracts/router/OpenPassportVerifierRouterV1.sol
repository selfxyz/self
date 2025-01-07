// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IOpenPassportVerifierRouterV1.sol";
import "../constants/OpenPassportConstants.sol";
import "../libraries/OpenPassportFormatter.sol";
import "../interfaces/IProveCircuitVerifier.sol";
import "../interfaces/IDscCircuitVerifier.sol";

contract OpenPassportVerifierRouterV1 is UUPSUpgradeable, OwnableUpgradeable, IOpenPassportVerifierRouterV1 {

    error LENGTH_MISMATCH();
    error NO_VERIFIER_SET();
    error VERIFIER_CALL_FAILED();
    error INVALID_SIGNATURE_TYPE();
    error UNEQUAL_BLINDED_DSC_COMMITMENT();
    error CURRENT_DATE_NOT_IN_VALID_RANGE();
    error INVALID_PROVE_PROOF();
    error INVALID_DSC_PROOF();

    event ProveVerifierUpdated(uint256 typeId, address verifier);
    event DscVerifierUpdated(uint256 typeId, address verifier);

    mapping(uint256 => address) public signatureTypeToProveVerifiers;
    mapping(uint256 => address) public signatureTypeToDscVerifiers;

    function initialize() external initializer {
        __Ownable_init(msg.sender);
    }

    /// @dev UUPS: restrict upgrade auth to `onlyOwner`
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function updateProveVerifier(uint256 typeId, address verifier) external onlyOwner {
        signatureTypeToProveVerifiers[typeId] = verifier;
        emit ProveVerifierUpdated(typeId, verifier);
    }

    function updateDscVerifier(uint256 typeId, address verifier) external onlyOwner {
        signatureTypeToDscVerifiers[typeId] = verifier;
        emit DscVerifierUpdated(typeId, verifier);
    }

    function batchUpdateProveVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifiers
    ) external onlyOwner {
        if (typeIds.length != verifiers.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < typeIds.length; i++) {
            signatureTypeToProveVerifiers[typeIds[i]] = verifiers[i];
            emit ProveVerifierUpdated(typeIds[i], verifiers[i]);
        }
    }

    function batchUpdateDscVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifiers
    ) external onlyOwner {
        if (typeIds.length != verifiers.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < typeIds.length; i++) {
            signatureTypeToDscVerifiers[typeIds[i]] = verifiers[i];
            emit DscVerifierUpdated(typeIds[i], verifiers[i]);
        }
    }

    function verifyProveCircuit(
        uint256 proveVerifierId,
        ProveCircuitProof memory proveCircuitProof
    ) public view returns (bool result) {
        address verifier = signatureTypeToProveVerifiers[proveVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }
        if (proveCircuitProof.signatureType == SignatureType.RSA) {
            result = IRSAProveVerifier(verifier).verifyProof(
                proveCircuitProof.a,
                proveCircuitProof.b,
                proveCircuitProof.c,
                proveCircuitProof.pubSignalsRSA
            );
        } else if (proveCircuitProof.signatureType == SignatureType.ECDSA) {
            result = IECDSAProveVerifier(verifier).verifyProof(
                proveCircuitProof.a,
                proveCircuitProof.b,
                proveCircuitProof.c,
                proveCircuitProof.pubSignalsECDSA
            );
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
        return result;
    }

    function verifyDscCircuit(
        uint256 dscVerifierId,
        DscCircuitProof memory dscCircuitProof
    ) public view returns (bool result) {
        address verifier = signatureTypeToDscVerifiers[dscVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }
        result = IDscCircuitVerifier(verifier).verifyProof(
            dscCircuitProof.a,
            dscCircuitProof.b,
            dscCircuitProof.c,
            dscCircuitProof.pubSignals
        );
        return result;
    }

    function verify(
        OpenPassportProof memory proof
    )
        external
        view
        returns (ProveCircuitProof memory)
    {
        uint[6] memory dateNum;
        if (proof.proveCircuitProof.signatureType == SignatureType.RSA) {
            for (uint i = 0; i < 6; i++) {
                dateNum[i] = proof.proveCircuitProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_CURRENT_DATE_INDEX + i];
            }
        } else if (proof.proveCircuitProof.signatureType == SignatureType.ECDSA) {
            for (uint i = 0; i < 6; i++) {
                dateNum[i] = proof.proveCircuitProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_CURRENT_DATE_INDEX + i];
            }
        }
        uint currentTimestamp = OpenPassportFormatter.proofDateToUnixTimestamp(dateNum);

        // Check that the current date is within a +/- 1 day range
        if(
            currentTimestamp < block.timestamp - 1 days ||
            currentTimestamp > block.timestamp + 1 days
        ) {
            revert CURRENT_DATE_NOT_IN_VALID_RANGE();
        }

        // check blinded dcs
        bytes memory blindedDscCommitment;
        if (proof.proveCircuitProof.signatureType == SignatureType.RSA) {
            blindedDscCommitment = abi.encodePacked(proof.proveCircuitProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_BLINDED_DSC_COMMITMENT_INDEX]);
        } else if (proof.proveCircuitProof.signatureType == SignatureType.ECDSA) {
            blindedDscCommitment = abi.encodePacked(proof.proveCircuitProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_BLINDED_DSC_COMMITMENT_INDEX]);
        }

        if (
            keccak256(blindedDscCommitment) !=
            keccak256(abi.encodePacked(proof.dscCircuitProof.pubSignals[OpenPassportConstants.DSC_BLINDED_DSC_COMMITMENT_INDEX]))
        ) {
            revert UNEQUAL_BLINDED_DSC_COMMITMENT();
        }

        if (!verifyProveCircuit(proof.proveVerifierId, proof.proveCircuitProof)) {
            revert INVALID_PROVE_PROOF();
        }

        if (!verifyDscCircuit(proof.dscVerifierId, proof.dscCircuitProof)) {
            revert INVALID_DSC_PROOF();
        }

        return proof.proveCircuitProof;
    }

}
