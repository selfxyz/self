// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Interface for Register contract
/// @notice This interface declares the functions and events for the Register contract
interface IRegister {
    /// @notice Error thrown when an invalid Merkle root is provided
    error Register__InvalidMerkleRoot();
    /// @notice Error thrown when the same nullifier is used more than once
    error Register__YouAreUsingTheSameNullifierTwice();
    /// @notice Error thrown when the proof provided is invalid
    error Register__InvalidProof();

    /// @notice Event emitted when a proof is successfully validated
    /// @param merkle_root The Merkle root used in the proof
    /// @param nullifier The nullifier used in the proof
    /// @param commitment The commitment used in the proof
    event ProofValidated(
        uint merkle_root,
        uint nullifier,
        uint commitment
    );
    event AddCommitment(
        uint index,
        uint commitment,
        uint merkle_root
    );

    /// @notice Struct to hold data for Register proofs
    /// @param merkle_root The Merkle root used in the proof
    /// @param commitment The commitment used in the proof
    /// @param nullifier The nullifier used in the proof
    /// @param a The 'a' parameter of the zkSNARK proof
    /// @param b The 'b' parameter of the zkSNARK proof
    /// @param c The 'c' parameter of the zkSNARK proof
    struct RegisterProof {
        uint commitment;
        uint nullifier;
        uint signature_algorithm;
        uint merkle_root;
        uint[2] a;
        uint[2][2] b;
        uint[2] c;
    }

    /// @notice Validates a Register proof
    /// @param proof The Register proof to validate
    function validateProof(RegisterProof calldata proof) external;

    /// @notice Verifies a Register proof
    /// @param proof The Register proof to verify
    /// @return bool Returns true if the proof is valid, false otherwise
    function verifyProof(RegisterProof calldata proof) external view returns (bool);


    /// @notice Checks if a given root is valid
    /// @param root The root to check
    /// @return bool Returns true if the root is valid, false otherwise
    function checkRoot(uint root) external view returns (bool);

    /// @notice Gets the size of the Merkle tree
    /// @return uint Returns the size of the Merkle tree
    function getMerkleTreeSize() external view returns (uint);

    /// @notice Finds the index of a given commitment in the Merkle tree
    /// @param commitment The commitment to find
    /// @return uint Returns the index of the commitment
    function indexOf(uint commitment) external view returns (uint);
}