// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import {IOpenPassportRegister} from "../interfaces/IOpenPassportRegister.sol";
import {OpenPassportRegistry} from "./OpenPassportRegistry.sol";
import {IOpenPassportVerifier} from "../interfaces/IOpenPassportVerifier.sol";
import {IGenericVerifier} from "../interfaces/IGenericVerifier.sol";
import {Base64} from "../libraries/Base64.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../constants/OpenPassportConstants.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";

contract OpenPassportRegister is IOpenPassportRegister, Ownable {
    OpenPassportRegistry public immutable openPassportRegistry;
    IOpenPassportVerifier public immutable openPassportVerifier;

    using Base64 for *;
    using Strings for uint256;

    using InternalLeanIMT for LeanIMTData;
    LeanIMTData internal imt;

    // poseidon("E-PASSPORT")
    bytes32 public attestationId =
        bytes32(
            0x12d57183e0a41615471a14e5a93c87b9db757118c1d7a6a9f73106819d656f24
        );

    mapping(uint256 => bool) public nullifiers;
    mapping(uint256 => bool) public merkleRootsCreated;

    constructor(OpenPassportRegistry _openPassportRegistry, address _openPassportVerifier) Ownable(msg.sender) {
        openPassportRegistry = _openPassportRegistry;
        openPassportVerifier = IOpenPassportVerifier(_openPassportVerifier);

        transferOwnership(msg.sender);
    }

    function registerCommitment(
        IOpenPassportVerifier.OpenPassportAttestation memory attestation
    ) external {
        openPassportVerifier.verify(attestation);

        if (!openPassportRegistry.checkRoot(bytes32(attestation.dProof.pubSignals[OpenPassportConstants.DSC_MERKLE_ROOT_INDEX]))) {
            revert("Register__InvalidMerkleRoot");
        }

        // if (nullifiers[proof.nullifier]) {
        //     revert("YouAreUsingTheSameNullifierTwice");
        // }

        // if (bytes32(attestation.pProof.pubSignals[OpenPassportConstants.PROVE_RSA_USER_IDENTIFIER_INDEX]) != attestationId) {
        //     revert("Register__InvalidAttestationId");
        // }

        if (attestation.pProof.signatureType == IGenericVerifier.SignatureType.RSA) {
            nullifiers[attestation.pProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_COMMITMENT_INDEX]] = true;
            _addCommitment(attestation.pProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_COMMITMENT_INDEX]);
            emit ProofValidated(
                attestation.dProof.pubSignals[OpenPassportConstants.DSC_MERKLE_ROOT_INDEX],
                attestation.pProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_NULLIFIER_INDEX],
                attestation.pProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_COMMITMENT_INDEX]
            );
        } else if (attestation.pProof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
            nullifiers[attestation.pProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_COMMITMENT_INDEX]] = true;
            _addCommitment(attestation.pProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_COMMITMENT_INDEX]);
            emit ProofValidated(
                attestation.dProof.pubSignals[OpenPassportConstants.DSC_MERKLE_ROOT_INDEX],
                attestation.pProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_NULLIFIER_INDEX],
                attestation.pProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_COMMITMENT_INDEX]
            );
        } else {
            revert Register__InvalidProveProof();
        }
    }

    function _addCommitment(uint256 commitment) internal {
        uint256 index = getMerkleTreeSize();
        uint256 imt_root = imt._insert(commitment);
        merkleRootsCreated[imt_root] = true;
        emit AddCommitment(index, commitment, imt_root);
    }

    function checkRoot(uint256 root) external view returns (bool) {
        return merkleRootsCreated[root];
    }

    function getMerkleTreeSize() public view returns (uint256) {
        return imt.size;
    }

    function getMerkleRoot() public view returns (uint256) {
        return imt._root();
    }

    function indexOf(uint commitment) public view returns (uint256) {
        return imt._indexOf(commitment);
    }

    function devAddCommitment(uint commitment) external onlyOwner {
        _addCommitment(commitment);
    }
}