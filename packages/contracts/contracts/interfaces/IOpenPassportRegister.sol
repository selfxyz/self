// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IOpenPassportVerifier} from "../interfaces/IOpenPassportVerifier.sol";

/// @title Interface for Register contract
/// @notice This interface declares the functions and events for the Register contract
interface IOpenPassportRegister {
    /// @notice Error thrown when an invalid Merkle root is provided
    error Register__InvalidMerkleRoot();
    /// @notice Error thrown when the same nullifier is used more than once
    error Register__YouAreUsingTheSameNullifierTwice();
    /// @notice Error thrown when the proof provided is invalid
    error Register__InvalidProofRegister();
    /// @notice Error thrown when the prove proof provided is invalid
    error Register__InvalidProveProof();
    /// @notice Error thrown when the proof provided is invalid
    error Register__InvalidProofCSCA();
    /// @notice Error thrown when the signature algorithm provided is invalid
    error Register__InvalidSignatureAlgorithm();
    /// @notice Error thrown when the verifier address is invalid
    error Register__InvalidVerifierAddress();
    /// @notice Error thrown when the signature algorithm is already set
    error Register__SignatureAlgorithmAlreadySet();
    /// @notice Error thrown when the blinded_dsc_commitment don't match between the proofs
    error Register__BlindedDSCCommitmentDontMatch();
    /// @notice Error thrown when the attestation id is invalid
    error Register__InvalidAttestationId();

    /// @notice Event emitted when a proof is successfully validated
    /// @param merkle_root The Merkle root used in the proof
    /// @param nullifier The nullifier used in the proof
    /// @param commitment The commitment used in the proof
    event ProofValidated(uint merkle_root, uint nullifier, uint commitment);
    event AddCommitment(uint index, uint commitment, uint merkle_root);

    /// @notice Struct to hold data for Register proofs
    /// @param merkle_root The Merkle root used in the proof
    /// @param commitment The commitment used in the proof
    /// @param nullifier The nullifier used in the proof
    /// @param a The 'a' parameter of the zkSNARK proof
    /// @param b The 'b' parameter of the zkSNARK proof
    /// @param c The 'c' parameter of the zkSNARK proof
    struct RegisterProof {
        uint blinded_dsc_commitment;
        uint nullifier;
        uint commitment;
        uint attestation_id;
        uint[2] a;
        uint[2][2] b;
        uint[2] c;
    }


    /// @notice Validates a Register proof
    /// @param attestation The Register proof to validate
    function registerCommitment(
        IOpenPassportVerifier.OpenPassportAttestation memory attestation
    ) external;

    /// @notice Checks if a given root is valid
    /// @param root The root to check
    /// @return bool Returns true if the root is valid, false otherwise
    function checkRoot(uint root) external view returns (bool);

    /// @notice Gets the size of the Merkle tree
    /// @return uint Returns the size of the Merkle tree
    function getMerkleTreeSize() external view returns (uint);

    /// @notice Retrieves the current Merkle root of the tree
    /// @return uint256 Returns the current Merkle root
    function getMerkleRoot() external view returns (uint);

    /// @notice Finds the index of a given commitment in the Merkle tree
    /// @param commitment The commitment to find
    /// @return uint Returns the index of the commitment
    function indexOf(uint commitment) external view returns (uint);

    /// @notice DEV function
    function devAddCommitment(uint commitment) external;
}